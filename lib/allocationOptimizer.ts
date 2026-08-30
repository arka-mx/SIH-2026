import { ReportItem, ResourceItem, calcDistanceKm } from "@/lib/api";
import {
  buildHeatPoints,
  clusterZones,
  riskTier,
  HeatZone,
} from "@/lib/disasterHeat";

/**
 * Resource & Shelter Allocation Optimizer
 * ======================================
 * Given the live disaster picture (active incidents clustered into affected
 * zones) and the master resource pool (shelters, medical vans, boats, food
 * stock, rescue teams), this module recommends the best allocation instead of
 * leaving it to manual judgement.
 *
 * For every affected zone it answers: which resource / shelter should go here,
 * why, how much of it, and what capacity is left afterwards. The matching
 * balances six signals the brief calls out:
 *
 *   • distance            — straight-line km from the resource to the zone
 *   • route accessibility — hazard-aware detour + speed model → ETA, reachable?
 *   • capacity            — free beds / relief units the resource still has
 *   • severity            — zone heat tier (critical zones are matched first)
 *   • demand              — people affected + casualties → how much is needed
 *   • availability        — only `available` resources are offered
 *
 * The engine is pure and deterministic so the same inputs always produce the
 * same recommendation; the admin UI just renders it and lets the operator
 * confirm.
 */

/* ───────────────────────────── demand model ───────────────────────────── */

/** Rough headcount behind one clustered zone. */
function estimatePeopleAffected(zone: HeatZone): number {
  // Each corroborating report ≈ a household; injuries add individual load.
  return Math.max(1, Math.round(zone.reports * 4 + zone.injured * 1.5));
}

/* ─────────────────────────── accessibility model ──────────────────────── */

// Ground speed a relief vehicle can realistically hold on the approach, and how
// much longer the drivable route is than the crow-flies distance, per hazard.
const ROUTE_PROFILE: Record<string, { speedKmh: number; detour: number }> = {
  flood: { speedKmh: 18, detour: 1.6 },
  landslide: { speedKmh: 14, detour: 1.9 },
  tsunami: { speedKmh: 20, detour: 1.6 },
  cyclone: { speedKmh: 22, detour: 1.35 },
  earthquake: { speedKmh: 20, detour: 1.45 },
  building_collapse: { speedKmh: 24, detour: 1.35 },
  fire: { speedKmh: 30, detour: 1.2 },
  gas_leak: { speedKmh: 28, detour: 1.25 },
  accident: { speedKmh: 34, detour: 1.15 },
  default: { speedKmh: 32, detour: 1.2 },
};

/** Furthest a resource can be (drivable km) and still count as reachable. */
const MAX_REACH_KM = 60;

export interface RouteAssessment {
  straightKm: number;
  drivableKm: number;
  etaMin: number;
  reachable: boolean;
  access: "clear" | "passable" | "constrained" | "cut_off";
  label: string;
}

function assessRoute(
  fromLat: number,
  fromLng: number,
  zone: HeatZone
): RouteAssessment {
  const hazard = zone.types[0]?.toLowerCase() || "default";
  const profile = ROUTE_PROFILE[hazard] || ROUTE_PROFILE.default;

  const straightKm = calcDistanceKm(fromLat, fromLng, zone.lat, zone.lng);
  const drivableKm = straightKm * profile.detour;
  const etaMin = Math.round((drivableKm / profile.speedKmh) * 60);
  const reachable = drivableKm <= MAX_REACH_KM;

  let access: RouteAssessment["access"];
  if (!reachable) access = "cut_off";
  else if (etaMin <= 15) access = "clear";
  else if (etaMin <= 40) access = "passable";
  else access = "constrained";

  const label =
    access === "cut_off"
      ? "Route cut off"
      : access === "clear"
      ? "Clear route"
      : access === "passable"
      ? "Passable route"
      : "Constrained route";

  return {
    straightKm: Math.round(straightKm * 10) / 10,
    drivableKm: Math.round(drivableKm * 10) / 10,
    etaMin,
    reachable,
    access,
    label,
  };
}

/* ──────────────────────────── resource helpers ────────────────────────── */

const SHELTER_TYPES = new Set(["shelter", "relief_camp", "camp"]);

export function resourceCoords(
  r: ResourceItem
): { lat: number; lng: number } | null {
  let lat = r.lat;
  let lng = r.lng;
  if ((lat == null || lng == null) && r.location_wkt) {
    const m = r.location_wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (m) {
      lng = parseFloat(m[1]);
      lat = parseFloat(m[2]);
    }
  }
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    (lat === 0 && lng === 0)
  ) {
    return null;
  }
  return { lat, lng };
}

export function remainingCapacity(r: ResourceItem): number {
  return Math.max(0, (r.capacity_total || 0) - (r.capacity_used || 0));
}

function isShelter(r: ResourceItem): boolean {
  return SHELTER_TYPES.has((r.type || "").toLowerCase());
}

function humanType(t: string): string {
  return (t || "resource").replace(/_/g, " ");
}

/* ──────────────────────────── recommendation ──────────────────────────── */

export interface AllocationRecommendation {
  id: string;
  kind: "shelter" | "resource";
  priorityRank: number; // 1 = handled first
  severity: { label: string; tone: "red" | "amber" | "blue" };

  zoneKey: string;
  zoneLabel: string;
  zoneLat: number;
  zoneLng: number;
  zoneTypes: string[];
  peopleAffected: number;
  injured: number;
  heatIndex: number;

  resourceId: string;
  resourceName: string;
  resourceType: string;
  resourceLat: number;
  resourceLng: number;

  allocatedAmount: number;
  demandAmount: number;
  unit: string;
  fullyCovered: boolean;

  route: RouteAssessment;
  remainingCapacityAfter: number;
  capacityTotal: number;

  reason: string;
}

export interface UnservedZone {
  zoneKey: string;
  zoneLabel: string;
  zoneLat: number;
  zoneLng: number;
  zoneTypes: string[];
  peopleAffected: number;
  priorityRank: number;
  need: "shelter" | "relief" | "both";
  reason: string;
}

export interface OptimizerResult {
  recommendations: AllocationRecommendation[];
  unserved: UnservedZone[];
  summary: {
    zones: number;
    matched: number;
    peopleCovered: number;
    peopleAffected: number;
    sheltersUsed: number;
    resourcesUsed: number;
  };
}

interface WorkingResource {
  ref: ResourceItem;
  coords: { lat: number; lng: number };
  remaining: number;
}

/** Score a candidate resource for a zone — lower is better. */
function candidateCost(
  route: RouteAssessment,
  demand: number,
  remaining: number,
  typeMatch: boolean
): number {
  if (!route.reachable) return Number.POSITIVE_INFINITY;
  const shortfall = Math.max(0, demand - remaining);
  // ETA dominates; an unmet-demand penalty nudges toward resources that can
  // actually cover the zone; a small bonus for hazard-type specialisation.
  return route.etaMin + shortfall * 0.5 + (typeMatch ? 0 : 8);
}

function pickBest(
  pool: WorkingResource[],
  zone: HeatZone,
  demand: number,
  filter: (r: ResourceItem) => boolean
): { pick: WorkingResource; route: RouteAssessment } | null {
  let best: { pick: WorkingResource; route: RouteAssessment; cost: number } | null =
    null;

  for (const wr of pool) {
    if (wr.remaining <= 0) continue;
    if (!filter(wr.ref)) continue;

    const route = assessRoute(wr.coords.lat, wr.coords.lng, zone);
    if (!route.reachable) continue;

    const typeMatch =
      (wr.ref.disaster_types || []).some((t) =>
        zone.types.includes(t.toLowerCase())
      ) || false;

    const cost = candidateCost(route, demand, wr.remaining, typeMatch);
    if (!best || cost < best.cost) best = { pick: wr, route, cost };
  }

  return best ? { pick: best.pick, route: best.route } : null;
}

export interface OptimizerInput {
  incidents: ReportItem[];
  resources: ResourceItem[];
  base?: { lat: number; lng: number } | null;
  now?: number;
}

export function optimizeAllocations({
  incidents,
  resources,
  base,
  now = Date.now(),
}: OptimizerInput): OptimizerResult {
  const active = incidents.filter(
    (i) => i.status !== "resolved" && i.status !== "cancelled"
  );
  const zones = clusterZones(buildHeatPoints(active, now), base ?? null);

  // Priority: critical zones first. Blend peak heat, casualties and volume.
  const ranked = [...zones].sort((a, b) => {
    const sa = a.peak * 2 + a.injured * 1.5 + a.reports * 0.4;
    const sb = b.peak * 2 + b.injured * 1.5 + b.reports * 0.4;
    return sb - sa;
  });

  const shelters: WorkingResource[] = [];
  const reliefs: WorkingResource[] = [];
  for (const r of resources) {
    if (r.status && r.status !== "available") continue; // availability
    const coords = resourceCoords(r);
    if (!coords) continue;
    const wr: WorkingResource = { ref: r, coords, remaining: remainingCapacity(r) };
    if (wr.remaining <= 0) continue;
    (isShelter(r) ? shelters : reliefs).push(wr);
  }

  const recommendations: AllocationRecommendation[] = [];
  const unserved: UnservedZone[] = [];
  let peopleCovered = 0;
  let peopleAffected = 0;
  const shelterIds = new Set<string>();
  const resourceIds = new Set<string>();

  ranked.forEach((zone, idx) => {
    const rank = idx + 1;
    const people = estimatePeopleAffected(zone);
    peopleAffected += people;
    const tier = riskTier(zone.intensity);
    const zoneTypesLabel = zone.types.map(humanType).join(" / ");
    const priorityNote =
      tier.tone === "red"
        ? "Critical zone — prioritised first."
        : tier.tone === "amber"
        ? "Elevated-risk zone."
        : "Moderate-risk zone.";

    let shelterMissing = false;
    let reliefMissing = false;

    /* ---- shelter assignment ---- */
    const shelterPick = pickBest(shelters, zone, people, () => true);
    if (shelterPick) {
      const { pick, route } = shelterPick;
      const allocated = Math.min(people, pick.remaining);
      pick.remaining -= allocated;
      const fully = allocated >= people;
      peopleCovered += allocated;
      shelterIds.add(pick.ref.id);

      recommendations.push({
        id: `${zone.key}::${pick.ref.id}::shelter`,
        kind: "shelter",
        priorityRank: rank,
        severity: tier,
        zoneKey: zone.key,
        zoneLabel: zone.label,
        zoneLat: zone.lat,
        zoneLng: zone.lng,
        zoneTypes: zone.types,
        peopleAffected: people,
        injured: zone.injured,
        heatIndex: Math.round(zone.intensity * 10) / 10,
        resourceId: pick.ref.id,
        resourceName: pick.ref.name,
        resourceType: pick.ref.type,
        resourceLat: pick.coords.lat,
        resourceLng: pick.coords.lng,
        allocatedAmount: allocated,
        demandAmount: people,
        unit: "beds",
        fullyCovered: fully,
        route,
        remainingCapacityAfter: pick.remaining,
        capacityTotal: pick.ref.capacity_total || 0,
        reason:
          `Nearest reachable shelter (${route.drivableKm} km drivable, ~${route.etaMin} min, ${route.label.toLowerCase()}) ` +
          `with ${pick.remaining + allocated} free beds. ` +
          (fully
            ? `Covers all ${people} people displaced by the ${zoneTypesLabel} zone`
            : `Covers ${allocated} of ${people} people — top up from a second shelter`) +
          `. ${priorityNote}`,
      });
    } else {
      shelterMissing = true;
    }

    /* ---- primary relief resource assignment ---- */
    const reliefPick = pickBest(reliefs, zone, people, () => true);
    if (reliefPick) {
      const { pick, route } = reliefPick;
      const allocated = Math.min(people, pick.remaining);
      pick.remaining -= allocated;
      const fully = allocated >= people;
      resourceIds.add(pick.ref.id);
      const typeMatch = (pick.ref.disaster_types || []).some((t) =>
        zone.types.includes(t.toLowerCase())
      );

      recommendations.push({
        id: `${zone.key}::${pick.ref.id}::resource`,
        kind: "resource",
        priorityRank: rank,
        severity: tier,
        zoneKey: zone.key,
        zoneLabel: zone.label,
        zoneLat: zone.lat,
        zoneLng: zone.lng,
        zoneTypes: zone.types,
        peopleAffected: people,
        injured: zone.injured,
        heatIndex: Math.round(zone.intensity * 10) / 10,
        resourceId: pick.ref.id,
        resourceName: pick.ref.name,
        resourceType: pick.ref.type,
        resourceLat: pick.coords.lat,
        resourceLng: pick.coords.lng,
        allocatedAmount: allocated,
        demandAmount: people,
        unit: "relief units",
        fullyCovered: fully,
        route,
        remainingCapacityAfter: pick.remaining,
        capacityTotal: pick.ref.capacity_total || 0,
        reason:
          `${humanType(pick.ref.type)} "${pick.ref.name}" is the nearest reachable ` +
          `${typeMatch ? `${zoneTypesLabel}-capable ` : ""}unit ` +
          `(${route.drivableKm} km, ~${route.etaMin} min, ${route.label.toLowerCase()}). ` +
          (fully
            ? `Enough stock for all ${people} affected`
            : `Sends ${allocated} of ${people} needed — schedule a resupply run`) +
          `. ${priorityNote}`,
      });
    } else {
      reliefMissing = true;
    }

    if (shelterMissing || reliefMissing) {
      unserved.push({
        zoneKey: zone.key,
        zoneLabel: zone.label,
        zoneLat: zone.lat,
        zoneLng: zone.lng,
        zoneTypes: zone.types,
        peopleAffected: people,
        priorityRank: rank,
        need:
          shelterMissing && reliefMissing
            ? "both"
            : shelterMissing
            ? "shelter"
            : "relief",
        reason:
          shelterMissing && reliefMissing
            ? "No available shelter or relief resource within a reachable route."
            : shelterMissing
            ? "No available shelter within a reachable route — request mutual aid or open an overflow camp."
            : "No available relief resource within a reachable route — escalate to district reserve.",
      });
    }
  });

  return {
    recommendations,
    unserved,
    summary: {
      zones: ranked.length,
      matched: recommendations.length,
      peopleCovered,
      peopleAffected,
      sheltersUsed: shelterIds.size,
      resourcesUsed: resourceIds.size,
    },
  };
}
