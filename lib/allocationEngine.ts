/**
 * Resource Allocation Engine
 * ==========================
 * The coordination core the admin console is built around. Given ONE incident
 * and the live resource pool, it answers: which available resource should go
 * here, why, and how much of it. The match balances the five signals the brief
 * calls out:
 *
 *   • distance     — straight-line km from the resource to the incident
 *   • resource type — does this resource suit the hazard? (boats for floods,
 *                     ambulances for medical, shelters for displacement …)
 *   • availability  — only `available` units are recommended; busy ones rank low
 *   • capacity      — free beds / relief units vs. the estimated demand
 *   • severity      — critical incidents widen the search radius and get first
 *                     call on scarce capacity
 *
 * Pure and deterministic: the same inputs always produce the same ranking, so
 * the API layer and the UI can both call it and agree.
 */

export type IncidentSeverity = "critical" | "high" | "moderate" | "low";

export interface EngineIncident {
  id: string;
  type: string;
  lat: number;
  lng: number;
  severity?: IncidentSeverity;
  injured?: number;
  description?: string;
  status?: string;
}

export interface EngineResource {
  id: string;
  name: string;
  type: string;
  capacity_total: number;
  capacity_used: number;
  status: string; // available | en_route | at_scene
  disaster_types: string[];
  lat: number;
  lng: number;
}

export interface ScoredResource {
  resource: EngineResource;
  distanceKm: number;
  etaMin: number;
  reachable: boolean;
  score: number; // 0-100, higher is a better match
  typeMatch: "specialised" | "suitable" | "generic" | "poor";
  headroom: number;
  capacityFit: "full" | "partial" | "none";
  available: boolean;
  reasons: string[];
}

/* ───────────────────────────── geo ───────────────────────────── */

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ───────────────────────── demand model ─────────────────────── */

const SEVERITY_BASE_HEADCOUNT: Record<IncidentSeverity, number> = {
  critical: 40,
  high: 22,
  moderate: 10,
  low: 4,
};

export function parseInjured(description?: string): number {
  if (!description) return 0;
  const m = description.match(/injured\s*:?\s*(\d+)/i);
  return m ? Math.min(parseInt(m[1], 10) || 0, 40) : 0;
}

/** Severity inferred from the hazard type + casualty text when not set. */
export function inferSeverity(inc: EngineIncident): IncidentSeverity {
  if (inc.severity) return inc.severity;
  const injured = inc.injured ?? parseInjured(inc.description);
  const t = (inc.type || "").toLowerCase();
  const highRisk = ["earthquake", "building_collapse", "tsunami", "fire", "gas_leak"];
  if (injured >= 5 || highRisk.includes(t)) return "critical";
  if (injured >= 1 || ["flood", "cyclone", "landslide", "medical"].includes(t))
    return "high";
  return "moderate";
}

/** People / relief-units this incident needs covered. */
export function estimateDemand(inc: EngineIncident): number {
  const severity = inferSeverity(inc);
  const injured = inc.injured ?? parseInjured(inc.description);
  return Math.max(1, Math.round(SEVERITY_BASE_HEADCOUNT[severity] + injured * 1.5));
}

/* ─────────────────────── type suitability ───────────────────── */

// Which resource kinds are the right tool for a given hazard.
const HAZARD_AFFINITY: Record<string, string[]> = {
  flood: ["boat", "rescue_team", "shelter", "medical_van"],
  tsunami: ["boat", "rescue_team", "shelter", "medical_van"],
  cyclone: ["shelter", "rescue_team", "medical_van", "food_stock"],
  landslide: ["rescue_team", "medical_van", "ambulance", "shelter"],
  earthquake: ["rescue_team", "ambulance", "medical_van", "shelter"],
  building_collapse: ["rescue_team", "ambulance", "medical_van", "fire_engine"],
  fire: ["fire_engine", "rescue_team", "ambulance", "medical_van"],
  gas_leak: ["fire_engine", "rescue_team", "ambulance"],
  medical: ["ambulance", "medical_van"],
  accident: ["ambulance", "rescue_team", "medical_van"],
};

// Kinds that help in almost any displacement / relief situation.
const GENERIC_TYPES = new Set(["shelter", "rescue_team", "food_stock"]);

function classifyTypeMatch(
  inc: EngineIncident,
  res: EngineResource
): ScoredResource["typeMatch"] {
  const hazard = (inc.type || "").toLowerCase();
  const kind = (res.type || "").toLowerCase();
  if ((res.disaster_types || []).map((d) => d.toLowerCase()).includes(hazard))
    return "specialised";
  if ((HAZARD_AFFINITY[hazard] || []).includes(kind)) return "suitable";
  if (GENERIC_TYPES.has(kind)) return "generic";
  return "poor";
}

/* ─────────────────────── reach by severity ──────────────────── */

const REACH_KM: Record<IncidentSeverity, number> = {
  critical: 85,
  high: 60,
  moderate: 45,
  low: 30,
};
// How hard distance is penalised — critical incidents tolerate a longer haul.
const DISTANCE_DECAY: Record<IncidentSeverity, number> = {
  critical: 2.0,
  high: 3.0,
  moderate: 4.0,
  low: 5.0,
};
const URBAN_RESPONSE_KMH = 26;

export function headroomOf(r: EngineResource): number {
  return Math.max(0, (r.capacity_total || 0) - (r.capacity_used || 0));
}

/* ─────────────────────────── scoring ────────────────────────── */

const WEIGHTS = {
  distance: 0.34,
  availability: 0.2,
  capacity: 0.24,
  type: 0.22,
};

const TYPE_SCORE: Record<ScoredResource["typeMatch"], number> = {
  specialised: 100,
  suitable: 74,
  generic: 46,
  poor: 16,
};

function scoreOne(inc: EngineIncident, res: EngineResource): ScoredResource {
  const severity = inferSeverity(inc);
  const demand = estimateDemand(inc);
  const distanceKm =
    Math.round(haversineKm(inc.lat, inc.lng, res.lat, res.lng) * 10) / 10;
  const etaMin = Math.max(2, Math.round((distanceKm / URBAN_RESPONSE_KMH) * 60));
  const reachable = distanceKm <= REACH_KM[severity];

  const headroom = headroomOf(res);
  const available = (res.status || "available") === "available";
  const typeMatch = classifyTypeMatch(inc, res);

  const distanceScore = Math.max(
    0,
    100 - distanceKm * DISTANCE_DECAY[severity]
  );
  const availabilityScore =
    res.status === "available" ? 100 : res.status === "en_route" ? 34 : 12;
  const coverRatio = demand > 0 ? Math.min(1, headroom / demand) : headroom > 0 ? 1 : 0;
  const capacityScore = headroom <= 0 ? 0 : 25 + coverRatio * 75;
  const typeScore = TYPE_SCORE[typeMatch];

  let score =
    WEIGHTS.distance * distanceScore +
    WEIGHTS.availability * availabilityScore +
    WEIGHTS.capacity * capacityScore +
    WEIGHTS.type * typeScore;
  if (!reachable) score *= 0.35;
  score = Math.round(Math.max(0, Math.min(100, score)));

  const capacityFit: ScoredResource["capacityFit"] =
    headroom <= 0 ? "none" : headroom >= demand ? "full" : "partial";

  const reasons: string[] = [];
  reasons.push(
    reachable
      ? `${distanceKm} km away · ~${etaMin} min`
      : `${distanceKm} km — beyond the ${REACH_KM[severity]} km reach for a ${severity} incident`
  );
  reasons.push(
    typeMatch === "specialised"
      ? `Specialised for ${inc.type} response`
      : typeMatch === "suitable"
      ? `${res.type.replace(/_/g, " ")} suits a ${inc.type} incident`
      : typeMatch === "generic"
      ? `General-purpose ${res.type.replace(/_/g, " ")}`
      : `Not an obvious fit for ${inc.type}`
  );
  reasons.push(
    capacityFit === "full"
      ? `${headroom} free — covers the estimated ${demand}`
      : capacityFit === "partial"
      ? `${headroom} free — partial cover of ${demand}, plan a top-up`
      : `At capacity — nothing free to commit`
  );
  if (!available)
    reasons.push(`Currently ${String(res.status).replace(/_/g, " ")}`);

  return {
    resource: res,
    distanceKm,
    etaMin,
    reachable,
    score,
    typeMatch,
    headroom,
    capacityFit,
    available,
    reasons,
  };
}

/**
 * Rank every resource for one incident, best match first. Nothing is filtered
 * out — a full or far resource simply scores low — so the operator always sees
 * the whole picture.
 */
export function rankResources(
  inc: EngineIncident,
  resources: EngineResource[]
): ScoredResource[] {
  return resources
    .filter(
      (r) =>
        Number.isFinite(r.lat) &&
        Number.isFinite(r.lng) &&
        !(r.lat === 0 && r.lng === 0)
    )
    .map((r) => scoreOne(inc, r))
    .sort((a, b) => b.score - a.score);
}

/**
 * The single resource to auto-recommend: best-scoring unit that is actually
 * available, reachable and has capacity to give. `null` when nothing qualifies.
 */
export function recommendResource(
  inc: EngineIncident,
  resources: EngineResource[]
): ScoredResource | null {
  const ranked = rankResources(inc, resources);
  return (
    ranked.find((c) => c.available && c.reachable && c.headroom > 0) || null
  );
}
