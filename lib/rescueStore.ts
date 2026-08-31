import { calcDistanceKm } from "@/lib/api";
import {
  verifyReport,
  VerificationResult,
  VerifiableIncident,
} from "@/lib/reportVerification";
import { dispatchEmergencyAlert } from "@/lib/emergencyAlertStore";
import { estimateDemand, rankResources } from "@/lib/allocationEngine";
import { releaseCapacity, snapshotResources } from "@/lib/resourceStore";
import { resolveAllocationForReport, upsertRecommendation } from "@/lib/allocationStore";
import type { AiReportEnrichment } from "@/lib/ai/reportEnrichment";

export interface RecommendedAllocationSummary {
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

export interface RescueReportEvent {
  id: string;
  incident_id: string;
  device_id: string;
  type: string;
  message: string;
  latitude: number;
  longitude: number;
  location_accuracy?: number;
  ip_address: string;
  user_agent?: string;
  idempotency_key?: string;
  reporter_kind?: "citizen" | "responder" | "authority";
  created_at: string;
}

export interface ReportConfirmation {
  id: string;
  /** Who vouched for the report. */
  by: "citizen" | "responder" | "authority" | "admin";
  actor_id?: string;
  actor_name?: string;
  note?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export interface ActiveRescueIncident {
  id: string;
  incident_id: string;
  device_id: string;
  status: "unverified" | "verified" | "in_progress" | "resolved" | "cancelled";
  severity: "critical" | "high" | "moderate" | "low";
  latitude: number;
  longitude: number;
  location_wkt?: string;
  address?: string;
  description: string;
  type: string;
  reporter_name?: string;
  report_count: number;
  reports: RescueReportEvent[];
  /** Explicit corroborations from citizens / responders / authorities. */
  confirmations: ReportConfirmation[];
  /** Attached media strengthens the report. */
  has_photo?: boolean;
  has_video?: boolean;
  /** An admin manually vouched for this report. */
  manually_verified?: boolean;
  /** Latest output of the Report Verification System. */
  verification?: VerificationResult;
  /** Public URL of the first photo attached to this incident, if any. */
  photo_url?: string;
  /**
   * Advisory read of the report's *content* by Gemini (summary, severity,
   * hazards, photo/type match, credibility, language). Never affects the
   * verification score or dispatch — an operator still decides. Populated
   * asynchronously shortly after the incident is created.
   */
  ai_enrichment?: AiReportEnrichment | null;
  ai_enriched_at?: string;
  /**
   * Auto-computed best resource match, refreshed while the incident is verified
   * and not yet dispatched. Non-binding — an operator confirms it to allocate.
   */
  recommended_allocation?: RecommendedAllocationSummary | null;
  assigned_rescuer_id?: string;
  assigned_rescuer?: any;
  rescuer_status?: "pending_admin" | "assigned" | "admin_denied_auto_routed" | "arrived";
  denied_by_admin?: boolean;
  assignment_source?: "admin_dispatch" | "nearest_fallback_admin_denied";
  cancel_reason?: string;
  cancelled_by?: "citizen_cancel" | "citizen_safe";
  /** Set once the Emergency Alert System has broadcast this verified disaster. */
  alert_dispatched?: boolean;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface SubmitRescuePayload {
  device_id: string;
  type: string;
  message?: string;
  latitude: number;
  longitude: number;
  location_accuracy?: number;
  ip_address: string;
  user_agent?: string;
  idempotency_key?: string;
  address?: string;
  reporter_name?: string;
  reporter_kind?: "citizen" | "responder" | "authority";
  has_photo?: boolean;
  has_video?: boolean;
  photo_url?: string;
}

export interface RescueSubmissionResult {
  success: boolean;
  incident_id: string;
  action: "CREATED" | "UPDATED" | "IDEMPOTENT_DUPLICATE";
  incident: ActiveRescueIncident;
  report: RescueReportEvent;
}

// In-Memory state fallback for incidents and events
let inMemoryIncidents: ActiveRescueIncident[] = [];
let inMemoryEvents: RescueReportEvent[] = [];
let idempotencyMap = new Map<string, RescueSubmissionResult>();

// Concurrency Mutex Lock per device_id to handle simultaneous requests
const deviceLocks = new Map<string, Promise<any>>();

function acquireLock(deviceId: string): () => void {
  let release: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    release = resolve;
  });
  
  const existing = deviceLocks.get(deviceId) || Promise.resolve();
  const chained = existing.then(() => lockPromise);
  deviceLocks.set(deviceId, chained);

  return () => {
    release();
    if (deviceLocks.get(deviceId) === chained) {
      deviceLocks.delete(deviceId);
    }
  };
}

/**
 * Core Anonymous Rescue Deduplication & Incident Creation Engine
 */
export async function processRescueSubmission(payload: SubmitRescuePayload): Promise<RescueSubmissionResult> {
  const releaseLock = acquireLock(payload.device_id);

  try {
    // 1. Idempotency Check
    if (payload.idempotency_key && idempotencyMap.has(payload.idempotency_key)) {
      const cached = idempotencyMap.get(payload.idempotency_key)!;
      return { ...cached, action: "IDEMPOTENT_DUPLICATE" };
    }

    const deviceId = payload.device_id || "dev-anonymous-client";
    const ip = payload.ip_address || "127.0.0.1";
    const nowIso = new Date().toISOString();

    // 2. Find active incident for this device_id (status != resolved && status != cancelled)
    let activeIncIndex = inMemoryIncidents.findIndex(
      (inc) => inc.device_id === deviceId && inc.status !== "resolved" && inc.status !== "cancelled"
    );

    let result: RescueSubmissionResult;

    if (activeIncIndex !== -1) {
      // ── STEP 3: Active Incident Exists -> APPEND REPORT EVENT & UPDATE INCIDENT ──
      // Location remains locked to the FIRST SOS submission for this device to prevent drift
      const existingInc = inMemoryIncidents[activeIncIndex];

      const initialLat =
        typeof existingInc.latitude === "number" && !isNaN(existingInc.latitude) && existingInc.latitude !== 0
          ? existingInc.latitude
          : payload.latitude;
      const initialLng =
        typeof existingInc.longitude === "number" && !isNaN(existingInc.longitude) && existingInc.longitude !== 0
          ? existingInc.longitude
          : payload.longitude;
      const initialAddress = existingInc.address || payload.address;
      const initialLocationWkt =
        existingInc.location_wkt || `POINT(${initialLng} ${initialLat})`;

      const reportEvent: RescueReportEvent = {
        id: "RPT-" + Math.floor(1000 + Math.random() * 9000) + "-" + Date.now().toString(36),
        incident_id: existingInc.incident_id,
        device_id: deviceId,
        type: payload.type || existingInc.type,
        message: payload.message || "Updated rescue status",
        latitude: initialLat,
        longitude: initialLng,
        location_accuracy: payload.location_accuracy || 10,
        ip_address: ip,
        user_agent: payload.user_agent,
        idempotency_key: payload.idempotency_key,
        reporter_kind: payload.reporter_kind || "citizen",
        created_at: nowIso,
      };

      inMemoryEvents.push(reportEvent);

      const updatedReports = [...existingInc.reports, reportEvent];
      let updatedInc: ActiveRescueIncident = {
        ...existingInc,
        reporter_name: existingInc.reporter_name || payload.reporter_name,
        type: payload.type || existingInc.type,
        description: payload.message ? `${existingInc.description} | ${payload.message}` : existingInc.description,
        latitude: initialLat,
        longitude: initialLng,
        location_wkt: initialLocationWkt,
        address: initialAddress,
        report_count: updatedReports.length,
        reports: updatedReports,
        confirmations: existingInc.confirmations || [],
        has_photo: existingInc.has_photo || payload.has_photo,
        has_video: existingInc.has_video || payload.has_video,
        photo_url: existingInc.photo_url || payload.photo_url,
        updated_at: nowIso,
      };

      updatedInc = applyVerification(updatedInc);
      inMemoryIncidents[activeIncIndex] = updatedInc;

      result = {
        success: true,
        incident_id: existingInc.incident_id,
        action: "UPDATED",
        incident: updatedInc,
        report: reportEvent,
      };
    } else {
      // ── STEP 4: No Active Incident Exists -> CREATE NEW INCIDENT ──
      const newIncId = "INC-" + Math.floor(1000 + Math.random() * 9000);

      const reportEvent: RescueReportEvent = {
        id: "RPT-" + Math.floor(1000 + Math.random() * 9000) + "-" + Date.now().toString(36),
        incident_id: newIncId,
        device_id: deviceId,
        type: payload.type || "flood",
        message: payload.message || "Initial rescue request",
        latitude: payload.latitude,
        longitude: payload.longitude,
        location_accuracy: payload.location_accuracy || 10,
        ip_address: ip,
        user_agent: payload.user_agent,
        idempotency_key: payload.idempotency_key,
        reporter_kind: payload.reporter_kind || "citizen",
        created_at: nowIso,
      };

      inMemoryEvents.push(reportEvent);

      let newInc: ActiveRescueIncident = {
        id: newIncId,
        incident_id: newIncId,
        device_id: deviceId,
        status: "unverified",
        severity: "high",
        latitude: payload.latitude,
        longitude: payload.longitude,
        location_wkt: `POINT(${payload.longitude} ${payload.latitude})`,
        address: payload.address || "Target Sector Location",
        description: payload.message || `Emergency Request (${payload.type.toUpperCase()})`,
        type: payload.type || "flood",
        reporter_name: payload.reporter_name,
        report_count: 1,
        reports: [reportEvent],
        confirmations: [],
        has_photo: payload.has_photo,
        has_video: payload.has_video,
        photo_url: payload.photo_url,
        created_at: nowIso,
        updated_at: nowIso,
      };

      newInc = applyVerification(newInc);
      inMemoryIncidents.unshift(newInc);

      // Fire-and-forget: let Gemini read the report's text + photo and attach an
      // advisory situation read. Off the critical path — the SOS is already
      // stored and scored regardless of whether this resolves or fails.
      void enrichIncidentInBackground(newInc);

      result = {
        success: true,
        incident_id: newIncId,
        action: "CREATED",
        incident: newInc,
        report: reportEvent,
      };
    }

    // A fresh report can also strengthen a neighbouring incident's cluster.
    recomputeAllVerification();
    const rescored = inMemoryIncidents.find((i) => i.id === result.incident.id);
    if (rescored) result.incident = rescored;

    if (payload.idempotency_key) {
      idempotencyMap.set(payload.idempotency_key, result);
    }

    return result;
  } finally {
    releaseLock();
  }
}

/* ─────────────────────────── AI Enrichment ──────────────────────────────── */

/**
 * Ask Gemini for an advisory read of a freshly-created incident and stash it on
 * the incident. Best-effort and non-blocking: any failure is logged and
 * swallowed, the incident is untouched. Dynamically imported so the AI module
 * (and its `fs` usage) never loads unless an SOS actually comes in.
 */
async function enrichIncidentInBackground(inc: ActiveRescueIncident): Promise<void> {
  try {
    const { enrichReport } = await import("@/lib/ai/reportEnrichment");
    const enrichment = await enrichReport({
      type: inc.type,
      description: inc.description,
      address: inc.address,
      reporter_name: inc.reporter_name,
      latitude: inc.latitude,
      longitude: inc.longitude,
      photo_url: inc.photo_url,
    });
    if (!enrichment) return;

    const index = inMemoryIncidents.findIndex((i) => i.id === inc.id);
    if (index === -1) return;
    inMemoryIncidents[index] = {
      ...inMemoryIncidents[index],
      ai_enrichment: enrichment,
      ai_enriched_at: enrichment.generated_at,
    };
  } catch (err) {
    console.warn("[rescueStore] AI enrichment failed:", (err as Error).message);
  }
}

/* ─────────────────────────── Report Verification ─────────────────────────── */

function toVerifiable(inc: ActiveRescueIncident): VerifiableIncident {
  return {
    id: inc.id,
    deviceId: inc.device_id,
    type: inc.type,
    latitude: inc.latitude,
    longitude: inc.longitude,
    status: inc.status,
    createdAt: inc.created_at,
    updatedAt: inc.updated_at,
    reporterName: inc.reporter_name,
    reports: (inc.reports || []).map((r) => ({
      deviceId: r.device_id,
      ipAddress: r.ip_address,
      latitude: r.latitude,
      longitude: r.longitude,
      createdAt: r.created_at,
      reporterKind: r.reporter_kind,
    })),
    confirmations: (inc.confirmations || []).map((c) => ({
      by: c.by,
      actorId: c.actor_id,
      createdAt: c.created_at,
    })),
    hasPhoto: inc.has_photo,
    hasVideo: inc.has_video,
    manuallyVerified: inc.manually_verified,
  };
}

/**
 * Recompute the confidence score for a single incident and progressively
 * promote its workflow `status` as confidence crosses thresholds. Never
 * downgrades a status an admin/rescuer already advanced.
 */
function applyVerification(inc: ActiveRescueIncident): ActiveRescueIncident {
  const population = inMemoryIncidents
    .filter((i) => i.id !== inc.id && i.status !== "cancelled")
    .map(toVerifiable);

  const verification = verifyReport(toVerifiable(inc), population);

  let status = inc.status;
  if (status === "unverified") {
    if (verification.tier === "verified") status = "verified";
  }

  const recommended_allocation = computeRecommendation(inc, status);

  // ── Emergency Alert System trigger ──
  // A citizen SOS that has just crossed into VERIFIED and is critical/high is an
  // actionable disaster: notify responders + authorities (and nearby citizens)
  // by SMS and in-app. Fire-and-forget; the alert store de-dupes repeats.
  if (inc.status === "unverified" && status === "verified" && !inc.alert_dispatched) {
    if (inc.severity === "critical" || inc.severity === "high") {
      void dispatchEmergencyAlert({
        category: "disaster_verified",
        alertType: `${(inc.type || "disaster").replace(/_/g, " ")} (verified)`,
        severity: inc.severity,
        audiences: ["responders", "authorities", "citizens"],
        locationName: inc.address,
        latitude: inc.latitude,
        longitude: inc.longitude,
        instructions: "Move to higher/safer ground and await responders. Call 112 if in immediate danger.",
        incidentId: inc.incident_id || inc.id,
        dedupeKey: `disaster_verified:${inc.incident_id || inc.id}`,
      }).catch((err) => console.error("Emergency alert dispatch failed:", err));
    }
    return { ...inc, verification, status, alert_dispatched: true, recommended_allocation };
  }

  return { ...inc, verification, status, recommended_allocation };
}

/**
 * Auto-allocation match. While an incident is verified but not yet dispatched,
 * pick the best available resource (distance + type + availability + capacity +
 * severity) and mirror it into the allocation ledger as a non-binding
 * `recommended` line. Cleared once a resource is assigned.
 */
function computeRecommendation(
  inc: ActiveRescueIncident,
  status: ActiveRescueIncident["status"]
): RecommendedAllocationSummary | null {
  if (status !== "verified" || inc.assigned_rescuer_id) return null;
  if (!Number.isFinite(inc.latitude) || !Number.isFinite(inc.longitude)) return null;

  try {
    const engineIncident = {
      id: inc.id,
      type: inc.type,
      lat: inc.latitude,
      lng: inc.longitude,
      severity: inc.severity,
      description: inc.description,
      status,
    };
    const ranked = rankResources(engineIncident, snapshotResources());
    const pick = ranked.find((c) => c.available && c.reachable && c.headroom > 0);
    if (!pick) return null;

    const demand = estimateDemand(engineIncident);
    const allocated = Math.min(demand, pick.headroom);
    const reason = pick.reasons.join(" · ");

    upsertRecommendation({
      report_id: inc.id,
      resource_id: pick.resource.id,
      resource_name: pick.resource.name,
      resource_type: pick.resource.type,
      demand,
      allocated,
      fully_covered: allocated >= demand,
      distance_km: pick.distanceKm,
      eta_min: pick.etaMin,
      reason,
      incident_type: inc.type,
      incident_lat: inc.latitude,
      incident_lng: inc.longitude,
      resource_lat: pick.resource.lat,
      resource_lng: pick.resource.lng,
    });

    return {
      resource_id: pick.resource.id,
      resource_name: pick.resource.name,
      resource_type: pick.resource.type,
      distance_km: pick.distanceKm,
      eta_min: pick.etaMin,
      demand,
      allocated,
      fully_covered: allocated >= demand,
      reason,
      score: pick.score,
    };
  } catch (err) {
    console.warn("[rescueStore] recommendation failed:", (err as Error).message);
    return null;
  }
}

/**
 * Re-score every active incident. A new report anywhere can strengthen a
 * neighbouring incident's cluster, so this runs after each submission.
 */
export function recomputeAllVerification(): void {
  inMemoryIncidents = inMemoryIncidents.map((inc) =>
    inc.status === "cancelled" || inc.status === "resolved"
      ? inc
      : applyVerification(inc)
  );
}

/**
 * Record an explicit cross-verification of a report by a nearby citizen,
 * a responder on scene, or an authority. Recomputes confidence immediately.
 */
export function addIncidentConfirmation(
  incidentId: string,
  input: Omit<ReportConfirmation, "id" | "created_at"> & { created_at?: string }
): ActiveRescueIncident | null {
  const index = inMemoryIncidents.findIndex(
    (i) => i.incident_id === incidentId || i.id === incidentId
  );
  if (index === -1) return null;

  const confirmation: ReportConfirmation = {
    id: "CFM-" + Math.floor(1000 + Math.random() * 9000) + "-" + Date.now().toString(36),
    by: input.by,
    actor_id: input.actor_id,
    actor_name: input.actor_name,
    note: input.note,
    latitude: input.latitude,
    longitude: input.longitude,
    created_at: input.created_at || new Date().toISOString(),
  };

  const inc = inMemoryIncidents[index];
  inMemoryIncidents[index] = applyVerification({
    ...inc,
    confirmations: [...(inc.confirmations || []), confirmation],
    updated_at: confirmation.created_at,
  });

  recomputeAllVerification();
  return inMemoryIncidents.find((i) => i.id === inc.id) || null;
}

/** Admin manually vouches for (or retracts a vouch on) a report. */
export function setIncidentManualVerification(
  incidentId: string,
  verified: boolean
): ActiveRescueIncident | null {
  const index = inMemoryIncidents.findIndex(
    (i) => i.incident_id === incidentId || i.id === incidentId
  );
  if (index === -1) return null;
  inMemoryIncidents[index] = applyVerification({
    ...inMemoryIncidents[index],
    manually_verified: verified,
    updated_at: new Date().toISOString(),
  });
  return inMemoryIncidents[index];
}

/**
 * Retrieves all incidents (optionally filtered by active status)
 */
export function getAllRescueIncidents(): ActiveRescueIncident[] {
  return inMemoryIncidents;
}

/**
 * Retrieves an incident by incident_id
 */
export function getRescueIncidentById(incidentId: string): ActiveRescueIncident | null {
  return inMemoryIncidents.find((i) => i.incident_id === incidentId || i.id === incidentId) || null;
}

/**
 * Retrieves active incident for a specific device_id
 */
export function getActiveIncidentForDevice(deviceId: string): ActiveRescueIncident | null {
  return inMemoryIncidents.find(
    (i) => i.device_id === deviceId && i.status !== "resolved" && i.status !== "cancelled"
  ) || null;
}

/**
 * Resolves or updates status of an incident
 */
export function updateRescueIncidentStatus(
  incidentId: string,
  status: ActiveRescueIncident["status"],
  extraProps?: Partial<ActiveRescueIncident>
): ActiveRescueIncident | null {
  const index = inMemoryIncidents.findIndex((i) => i.incident_id === incidentId || i.id === incidentId);
  if (index === -1) return null;

  const nowIso = new Date().toISOString();
  const updated: ActiveRescueIncident = {
    ...inMemoryIncidents[index],
    status,
    ...extraProps,
    updated_at: nowIso,
    ...(status === "resolved" ? { resolved_at: nowIso } : {}),
  };

  inMemoryIncidents[index] = updated;
  return updated;
}

/**
 * Cancels every active (not resolved / not already cancelled) incident belonging
 * to a device. Used when the citizen taps "Cancel SOS" or shares an "I'm safe"
 * check-in — the situation is over and any dispatch to admin / rescue team head
 * should be aborted. Returns the incidents that were cancelled.
 */
export function cancelActiveIncidentsForDevice(
  deviceId: string,
  reason: string = "Citizen cancelled the SOS",
  source: "citizen_cancel" | "citizen_safe" = "citizen_cancel"
): ActiveRescueIncident[] {
  const nowIso = new Date().toISOString();
  const cancelled: ActiveRescueIncident[] = [];

  inMemoryIncidents = inMemoryIncidents.map((inc) => {
    if (inc.device_id !== deviceId) return inc;
    if (inc.status === "resolved" || inc.status === "cancelled") return inc;

    const updated: ActiveRescueIncident = {
      ...inc,
      status: "cancelled",
      rescuer_status: undefined,
      assigned_rescuer: undefined,
      assigned_rescuer_id: undefined,
      description: `${inc.description} | ${reason}`,
      cancel_reason: reason,
      cancelled_by: source,
      updated_at: nowIso,
      resolved_at: nowIso,
    };
    cancelled.push(updated);
    return updated;
  });

  // Hand any held resource capacity back to the pool.
  for (const inc of cancelled) {
    const closed = resolveAllocationForReport(inc.id);
    if (closed) releaseCapacity(closed.resource_id, closed.allocated);
  }

  return cancelled;
}

/**
 * Multi-device Corroboration Query:
 * Finds incidents & reports within spatial radius and temporal window to count unique devices vs total reports.
 */
export function queryCorroboratedCluster(
  lat: number,
  lng: number,
  radiusKm: number = 0.5,
  windowMinutes: number = 15
) {
  const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const nearbyIncidents = inMemoryIncidents.filter((inc) => {
    if (inc.created_at < cutoffTime) return false;
    const dist = calcDistanceKm(lat, lng, inc.latitude, inc.longitude);
    return dist <= radiusKm;
  });

  const uniqueDeviceIds = new Set(nearbyIncidents.map((i) => i.device_id));
  const totalReportsCount = nearbyIncidents.reduce((sum, inc) => sum + inc.report_count, 0);
  const uniqueIpAddresses = new Set(
    nearbyIncidents.flatMap((inc) => inc.reports.map((r) => r.ip_address))
  );

  return {
    nearby_incidents: nearbyIncidents,
    unique_devices_count: uniqueDeviceIds.size,
    total_reports_count: totalReportsCount,
    unique_ips_count: uniqueIpAddresses.size,
    is_multi_device_corroborated: uniqueDeviceIds.size >= 3,
  };
}

/**
 * Reset memory state (For automated unit tests)
 */
export function _resetRescueStore(): void {
  inMemoryIncidents = [];
  inMemoryEvents = [];
  idempotencyMap.clear();
  deviceLocks.clear();
}
