/**
 * Allocation Service
 * ==================
 * Orchestrates the coordination flow the brief describes:
 *
 *   verified report → rank resources → best match → confirm → live status update
 *
 * Route handlers call in here; it reconciles the in-memory rescue store, the
 * resource pool, the allocation ledger and (best-effort) MongoDB, and fires the
 * emergency alert when a unit is committed.
 */

import {
  EngineIncident,
  ScoredResource,
  estimateDemand,
  headroomOf,
  inferSeverity,
  rankResources,
} from "@/lib/allocationEngine";
import {
  StoredResource,
  allocateCapacity,
  ensureResourcesHydrated,
  getResource,
  releaseCapacity,
  snapshotResources,
} from "@/lib/resourceStore";
import {
  StoredAllocation,
  confirmAllocation,
  getAllocationForReport,
  resolveAllocationForReport,
} from "@/lib/allocationStore";
import {
  getRescueIncidentById,
  updateRescueIncidentStatus,
} from "@/lib/rescueStore";
import { dispatchEmergencyAlert } from "@/lib/emergencyAlertStore";

/* ─────────────────────── incident resolution ────────────────── */

export interface ResolvedIncident {
  engine: EngineIncident;
  source: "rescue_store" | "mongo";
  address?: string;
  raw: unknown;
}

interface RawReportDoc {
  _id: { toString(): string };
  type: string;
  description?: string;
  address?: string;
  status?: string;
  location?: { coordinates?: number[] };
}

function looksLikeObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

export async function resolveIncident(
  reportId: string
): Promise<ResolvedIncident | null> {
  const local = getRescueIncidentById(reportId);
  if (local) {
    return {
      source: "rescue_store",
      address: local.address,
      raw: local,
      engine: {
        id: local.id,
        type: local.type,
        lat: local.latitude,
        lng: local.longitude,
        severity: local.severity,
        description: local.description,
        status: local.status,
      },
    };
  }

  if (looksLikeObjectId(reportId)) {
    try {
      const { connectToDatabase } = await import("@/lib/mongodb");
      const { ReportModel } = await import("@/lib/models/Report");
      await connectToDatabase();
      const doc = (await ReportModel.findById(reportId).lean()) as unknown as
        | RawReportDoc
        | null;
      if (doc) {
        const [lng, lat] = doc.location?.coordinates || [0, 0];
        return {
          source: "mongo",
          address: doc.address,
          raw: doc,
          engine: {
            id: doc._id.toString(),
            type: doc.type,
            lat: Number(lat),
            lng: Number(lng),
            description: doc.description,
            status: doc.status,
          },
        };
      }
    } catch (err) {
      console.warn("[allocationService] Mongo report lookup failed:", (err as Error).message);
    }
  }
  return null;
}

/* ───────────────────────────── shortlist ────────────────────── */

export interface ShortlistItem {
  id: string;
  name: string;
  type: string;
  capacity_total: number;
  capacity_used: number;
  status: string;
  disaster_types: string[];
  lat: number;
  lng: number;
  location_wkt: string;
  distance_meters: number;
  eta_min: number;
  match_score: number;
  match_reason: string;
  capacity_fit: ScoredResource["capacityFit"];
  reachable: boolean;
  recommended: boolean;
}

function toShortlistItem(s: ScoredResource, top: boolean): ShortlistItem {
  const r = s.resource as StoredResource;
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    capacity_total: r.capacity_total,
    capacity_used: r.capacity_used,
    status: r.status,
    disaster_types: r.disaster_types,
    lat: r.lat,
    lng: r.lng,
    location_wkt: r.location_wkt || `POINT(${r.lng} ${r.lat})`,
    distance_meters: Math.round(s.distanceKm * 1000),
    eta_min: s.etaMin,
    match_score: s.score,
    match_reason: s.reasons.join(" · "),
    capacity_fit: s.capacityFit,
    reachable: s.reachable,
    recommended: top && s.available && s.reachable && s.headroom > 0,
  };
}

export async function buildShortlist(
  incident: EngineIncident,
  limit = 6
): Promise<ShortlistItem[]> {
  await ensureResourcesHydrated();
  const ranked = rankResources(incident, snapshotResources());
  return ranked
    .slice(0, limit)
    .map((s, i) => toShortlistItem(s, i === 0));
}

/* ────────────────── non-binding recommendation ──────────────── */

export interface RecommendedAllocation {
  resource_id: string;
  resource_name: string;
  resource_type: string;
  distance_km: number;
  eta_min: number;
  demand: number;
  allocated: number;
  fully_covered: boolean;
  reason: string;
  score: number;
}

/** Synchronous best-match for an incident, from whatever pool is loaded. */
export function recommendForIncident(
  incident: EngineIncident
): { rec: RecommendedAllocation; scored: ScoredResource } | null {
  const ranked = rankResources(incident, snapshotResources());
  const pick = ranked.find((c) => c.available && c.reachable && c.headroom > 0);
  if (!pick) return null;
  const demand = estimateDemand(incident);
  const allocated = Math.min(demand, pick.headroom);
  return {
    scored: pick,
    rec: {
      resource_id: pick.resource.id,
      resource_name: pick.resource.name,
      resource_type: pick.resource.type,
      distance_km: pick.distanceKm,
      eta_min: pick.etaMin,
      demand,
      allocated,
      fully_covered: allocated >= demand,
      reason: pick.reasons.join(" · "),
      score: pick.score,
    },
  };
}

/* ─────────────────────────── confirm ────────────────────────── */

export interface ConfirmDispatchResult {
  ok: true;
  idempotent: boolean;
  allocation: StoredAllocation;
  report: { id: string; status: string };
  resource: {
    id: string;
    name: string;
    type: string;
    capacity_total: number;
    capacity_used: number;
    status: string;
  };
}

export interface ConfirmDispatchError {
  ok: false;
  status: number;
  error: string;
}

export async function confirmDispatch(params: {
  reportId: string;
  resourceId: string;
  confirmedBy?: string;
}): Promise<ConfirmDispatchResult | ConfirmDispatchError> {
  const { reportId, resourceId, confirmedBy = "authority" } = params;

  const resolved = await resolveIncident(reportId);
  if (!resolved) return { ok: false, status: 404, error: "Incident not found" };

  await ensureResourcesHydrated();
  const resource = getResource(resourceId);
  if (!resource) return { ok: false, status: 404, error: "Resource not found" };

  const incident = resolved.engine;
  const demand = estimateDemand(incident);
  const scored = rankResources(incident, [resource])[0];

  const prev = getAllocationForReport(reportId);
  const headroom = headroomOf(resource);
  const allocated = headroom > 0 ? Math.min(demand, headroom) : 0;

  const { allocation, superseded, idempotent } = confirmAllocation(
    {
      report_id: reportId,
      resource_id: resource.id,
      resource_name: resource.name,
      resource_type: resource.type,
      demand,
      allocated,
      fully_covered: allocated >= demand,
      distance_km: scored.distanceKm,
      eta_min: scored.etaMin,
      reason: scored.reasons.join(" · "),
      incident_type: incident.type,
      incident_lat: incident.lat,
      incident_lng: incident.lng,
      resource_lat: resource.lat,
      resource_lng: resource.lng,
    },
    confirmedBy
  );

  if (superseded && superseded.resource_id !== resource.id) {
    releaseCapacity(superseded.resource_id, superseded.allocated);
  }

  let updatedResource = resource;
  if (!idempotent) {
    const wasSameResourceRecommendation =
      prev && prev.resource_id === resource.id && prev.status === "recommended";
    // A recommendation never held capacity, so always charge on first confirm.
    void wasSameResourceRecommendation;
    updatedResource = allocateCapacity(resource.id, allocated) || resource;
  }

  // ── live incident status update ──
  if (resolved.source === "rescue_store") {
    updateRescueIncidentStatus(reportId, "in_progress", {
      assigned_rescuer_id: resource.id,
      assigned_rescuer: {
        id: resource.id,
        name: resource.name,
        type: resource.type,
        status: "en_route",
      },
      rescuer_status: "assigned",
      assignment_source: "admin_dispatch",
      denied_by_admin: false,
    });
  } else {
    try {
      const { connectToDatabase } = await import("@/lib/mongodb");
      const { ReportModel } = await import("@/lib/models/Report");
      const { AllocationModel } = await import("@/lib/models/Allocation");
      await connectToDatabase();
      await ReportModel.findByIdAndUpdate(reportId, { status: "in_progress" });
      if (!idempotent) {
        await AllocationModel.create({
          report_id: reportId,
          resource_id: resource.mongo_id || resource.id,
          status: "confirmed",
          confirmed_at: new Date(),
          confirmed_by: confirmedBy,
        });
      }
    } catch (err) {
      console.warn("[allocationService] Mongo allocation persist failed:", (err as Error).message);
    }
  }

  // ── emergency alert ──
  if (!idempotent) {
    const isShelter = String(resource.type).toLowerCase().includes("shelter");
    void dispatchEmergencyAlert({
      category: isShelter ? "shelter_allocation" : "resource_deployment",
      alertType: isShelter
        ? `Shelter allocated: ${resource.name}`
        : `${resource.name} dispatched`,
      severity: inferSeverity(incident) === "critical" ? "critical" : "high",
      audiences: ["citizens", "responders", "authorities"],
      locationName: resolved.address || incident.description,
      latitude: incident.lat,
      longitude: incident.lng,
      shelter: isShelter ? resource.name : undefined,
      instructions: isShelter
        ? "Proceed to the allocated shelter. Carry essential documents, water and medication."
        : "Help is on the way. Stay where responders can reach you and keep your phone on.",
      incidentId: reportId,
      dedupeKey: `deploy:${reportId}:${resource.id}`,
    }).catch((err) => console.error("Emergency alert dispatch failed:", err));
  }

  return {
    ok: true,
    idempotent,
    allocation,
    report: { id: reportId, status: "in_progress" },
    resource: {
      id: updatedResource.id,
      name: updatedResource.name,
      type: updatedResource.type,
      capacity_total: updatedResource.capacity_total,
      capacity_used: updatedResource.capacity_used,
      status: updatedResource.status,
    },
  };
}

/* ─────────────────────────── resolve ────────────────────────── */

/** Close an incident's allocation and hand capacity back to the pool. */
export function releaseAllocationForReport(reportId: string): StoredAllocation | null {
  const closed = resolveAllocationForReport(reportId);
  if (closed) {
    releaseCapacity(closed.resource_id, closed.allocated);
  }
  return closed;
}
