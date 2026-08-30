import { calcDistanceKm } from "@/lib/api";

/**
 * Report Verification System
 * ==========================
 * Every disaster report (citizen SOS, field update, or — later — a
 * crowd-sourced route hazard like "road flooded") is scored for how
 * *trustworthy* it is before it strongly influences resource allocation.
 *
 * The system never treats a single citizen report as ground truth. Confidence
 * rises only as independent evidence accumulates:
 *
 *   📍 Location consistency  — corroborating reports agree on where it is
 *   👥 Report clustering     — similar reports from DIFFERENT devices
 *   📸 Evidence              — photos / videos attached
 *   ⏱️ Recency               — fresh reports outrank stale ones
 *   👤 Reporter reliability  — verified responders / officials carry more weight
 *   🔄 Cross-verification    — explicit confirmation by nearby citizens,
 *                              responders or authorities
 *
 * Output is a 0–100 score bucketed into four tiers:
 *   <25  🟡 Unverified      — treat as a lead only
 *   25–54 ⚪ Reported        — plausible, keep gathering signal
 *   55–79 🟠 High confidence — safe to pre-stage resources
 *   ≥80  🔴 Verified        — act on it
 */

export type VerificationTier =
  | "unverified"
  | "reported"
  | "high_confidence"
  | "verified";

export interface VerificationFactor {
  key: string;
  icon: string;
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface VerificationResult {
  score: number;
  tier: VerificationTier;
  tierLabel: string;
  summary: string;
  factors: VerificationFactor[];
  cluster: {
    uniqueDevices: number;
    nearbyReports: number;
    radiusKm: number;
    windowMinutes: number;
  };
  computedAt: string;
}

export interface VerificationConfirmation {
  by: "citizen" | "responder" | "authority" | "admin";
  actorId?: string;
  createdAt: string;
}

export interface VerificationReportEvent {
  deviceId: string;
  ipAddress?: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  reporterKind?: "citizen" | "responder" | "authority";
}

/** Minimal shape the engine needs — decoupled from the store's own types. */
export interface VerifiableIncident {
  id: string;
  deviceId: string;
  type: string;
  latitude: number;
  longitude: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  reporterName?: string;
  reports: VerificationReportEvent[];
  confirmations?: VerificationConfirmation[];
  hasPhoto?: boolean;
  hasVideo?: boolean;
  /** Set true once an admin has manually vouched for the report. */
  manuallyVerified?: boolean;
}

const CLUSTER_RADIUS_KM = 0.6;
const CLUSTER_WINDOW_MINUTES = 45;

/** Device-id prefixes we treat as an accredited responder / official channel. */
const OFFICIAL_DEVICE_PREFIXES = ["resq-", "ndrf-", "sdrf-", "gov-", "unit-", "official-"];

export function isOfficialDevice(deviceId?: string): boolean {
  if (!deviceId) return false;
  const d = deviceId.toLowerCase();
  return OFFICIAL_DEVICE_PREFIXES.some((p) => d.startsWith(p));
}

function minutesSince(iso: string, now: number): number {
  return Math.max((now - new Date(iso).getTime()) / 60000, 0);
}

function maxPairwiseDistanceKm(
  pts: { latitude: number; longitude: number }[]
): number {
  let max = 0;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = calcDistanceKm(
        pts[i].latitude,
        pts[i].longitude,
        pts[j].latitude,
        pts[j].longitude
      );
      if (d > max) max = d;
    }
  }
  return max;
}

/**
 * Score `incident` using the whole `population` of incidents for cross-report
 * clustering. `population` should already exclude cancelled reports.
 */
export function verifyReport(
  incident: VerifiableIncident,
  population: VerifiableIncident[],
  now: number = Date.now()
): VerificationResult {
  const factors: VerificationFactor[] = [];

  // ── 👥 Report clustering ──────────────────────────────────────────────
  const windowCutoff = now - CLUSTER_WINDOW_MINUTES * 60000;
  const nearby = population.filter((other) => {
    if (other.id === incident.id) return false;
    if (new Date(other.updatedAt).getTime() < windowCutoff) return false;
    const dist = calcDistanceKm(
      incident.latitude,
      incident.longitude,
      other.latitude,
      other.longitude
    );
    if (dist > CLUSTER_RADIUS_KM) return false;
    // Same broad hazard family, or unspecified — flooding + "water logging" etc.
    return !incident.type || !other.type || sameHazardFamily(incident.type, other.type);
  });

  const otherDevices = new Set(nearby.map((n) => n.deviceId));
  otherDevices.delete(incident.deviceId);
  const uniqueDevices = otherDevices.size;
  const nearbyReports = nearby.reduce((s, n) => s + Math.max(n.reports.length, 1), 0);

  const selfRepeat = incident.reports.length;
  let clusterPts: number;
  let clusterDetail: string;
  if (uniqueDevices >= 5) {
    clusterPts = 28;
    clusterDetail = `${uniqueDevices} independent devices reporting the same area`;
  } else if (uniqueDevices === 4) {
    clusterPts = 25;
    clusterDetail = "4 independent devices corroborate";
  } else if (uniqueDevices === 3) {
    clusterPts = 22;
    clusterDetail = "3 independent devices corroborate";
  } else if (uniqueDevices === 2) {
    clusterPts = 17;
    clusterDetail = "2 other devices report the same area";
  } else if (uniqueDevices === 1) {
    clusterPts = 10;
    clusterDetail = "1 other device reports the same area";
  } else if (selfRepeat >= 3) {
    clusterPts = 6;
    clusterDetail = `Reporter re-confirmed ${selfRepeat}× (no independent corroboration yet)`;
  } else {
    clusterPts = 0;
    clusterDetail = "No independent corroboration yet";
  }
  factors.push({
    key: "clustering",
    icon: "👥",
    label: "Report clustering",
    points: clusterPts,
    max: 28,
    detail: clusterDetail,
  });

  // ── 🔄 Cross-verification (explicit confirmations) ────────────────────
  const confirmations = incident.confirmations ?? [];
  const hasResponder = confirmations.some((c) => c.by === "responder");
  const hasAuthority = confirmations.some(
    (c) => c.by === "authority" || c.by === "admin"
  );
  const citizenConfirmers = new Set(
    confirmations.filter((c) => c.by === "citizen").map((c) => c.actorId || Math.random().toString())
  ).size;
  let crossPts = 0;
  const crossBits: string[] = [];
  if (hasResponder) {
    crossPts += 12;
    crossBits.push("responder on scene");
  }
  if (hasAuthority) {
    crossPts += 12;
    crossBits.push("authority confirmed");
  }
  if (citizenConfirmers > 0) {
    const add = Math.min(citizenConfirmers * 4, 8);
    crossPts += add;
    crossBits.push(`${citizenConfirmers} citizen confirmation${citizenConfirmers > 1 ? "s" : ""}`);
  }
  crossPts = Math.min(crossPts, 22);
  factors.push({
    key: "cross_verification",
    icon: "🔄",
    label: "Cross-verification",
    points: crossPts,
    max: 22,
    detail: crossBits.length ? crossBits.join(", ") : "Awaiting confirmation",
  });

  // ── 📸 Evidence ──────────────────────────────────────────────────────
  let evidencePts = 0;
  const evidenceBits: string[] = [];
  if (incident.hasPhoto) {
    evidencePts += 14;
    evidenceBits.push("photo");
  }
  if (incident.hasVideo) {
    evidencePts += 6;
    evidenceBits.push("video");
  }
  evidencePts = Math.min(evidencePts, 18);
  factors.push({
    key: "evidence",
    icon: "📸",
    label: "Evidence",
    points: evidencePts,
    max: 18,
    detail: evidenceBits.length ? `${evidenceBits.join(" + ")} attached` : "No media attached",
  });

  // ── 📍 Location consistency ──────────────────────────────────────────
  const consistencyPts = scoreLocationConsistency(incident, nearby);
  factors.push(consistencyPts);

  // ── ⏱️ Recency ──────────────────────────────────────────────────────
  const lastActivityIso = [
    incident.updatedAt,
    ...incident.reports.map((r) => r.createdAt),
    ...confirmations.map((c) => c.createdAt),
  ].sort().pop() as string;
  const ageMin = minutesSince(lastActivityIso, now);
  let recencyPts: number;
  if (ageMin <= 10) recencyPts = 12;
  else if (ageMin <= 30) recencyPts = 10;
  else if (ageMin <= 120) recencyPts = 7;
  else if (ageMin <= 360) recencyPts = 4;
  else if (ageMin <= 1440) recencyPts = 2;
  else recencyPts = 1;
  factors.push({
    key: "recency",
    icon: "⏱️",
    label: "Recency",
    points: recencyPts,
    max: 12,
    detail:
      ageMin <= 60
        ? `Last signal ${Math.round(ageMin)} min ago`
        : `Last signal ${(ageMin / 60).toFixed(1)} h ago`,
  });

  // ── 👤 Reporter reliability ─────────────────────────────────────────
  const officialReport =
    isOfficialDevice(incident.deviceId) ||
    incident.reports.some(
      (r) => r.reporterKind === "responder" || r.reporterKind === "authority" || isOfficialDevice(r.deviceId)
    ) ||
    hasResponder ||
    hasAuthority;
  let reliabilityPts: number;
  let reliabilityDetail: string;
  if (officialReport) {
    reliabilityPts = 8;
    reliabilityDetail = "Accredited responder / official in the chain";
  } else if (incident.reporterName && incident.reporterName.trim().length > 1) {
    reliabilityPts = 2;
    reliabilityDetail = `Named reporter (${incident.reporterName.trim()})`;
  } else {
    reliabilityPts = 0;
    reliabilityDetail = "Anonymous citizen reporter";
  }
  factors.push({
    key: "reporter_reliability",
    icon: "👤",
    label: "Reporter reliability",
    points: reliabilityPts,
    max: 8,
    detail: reliabilityDetail,
  });

  // ── Total ───────────────────────────────────────────────────────────
  let score = factors.reduce((s, f) => s + f.points, 0);
  if (incident.manuallyVerified) score = Math.max(score, 82);
  score = Math.max(0, Math.min(Math.round(score), 100));

  const { tier, tierLabel } = tierFor(score);

  return {
    score,
    tier,
    tierLabel,
    summary: buildSummary(tier, uniqueDevices, incident, hasResponder || hasAuthority),
    factors,
    cluster: {
      uniqueDevices,
      nearbyReports,
      radiusKm: CLUSTER_RADIUS_KM,
      windowMinutes: CLUSTER_WINDOW_MINUTES,
    },
    computedAt: new Date(now).toISOString(),
  };
}

function scoreLocationConsistency(
  incident: VerifiableIncident,
  nearby: VerifiableIncident[]
): VerificationFactor {
  const pts = [
    { latitude: incident.latitude, longitude: incident.longitude },
    ...incident.reports.map((r) => ({ latitude: r.latitude, longitude: r.longitude })),
    ...nearby.map((n) => ({ latitude: n.latitude, longitude: n.longitude })),
  ].filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));

  if (pts.length <= 1) {
    return {
      key: "location_consistency",
      icon: "📍",
      label: "Location consistency",
      points: 4,
      max: 12,
      detail: "Single fix — nothing to cross-check yet",
    };
  }

  const spreadKm = maxPairwiseDistanceKm(pts);
  let points: number;
  if (spreadKm <= 0.15) points = 12;
  else if (spreadKm <= 0.4) points = 9;
  else if (spreadKm <= 0.8) points = 6;
  else if (spreadKm <= 1.5) points = 3;
  else points = 1;

  return {
    key: "location_consistency",
    icon: "📍",
    label: "Location consistency",
    points,
    max: 12,
    detail:
      spreadKm <= 0.4
        ? `${pts.length} fixes within ${Math.round(spreadKm * 1000)} m`
        : `Fixes scattered over ${spreadKm.toFixed(1)} km`,
  };
}

const HAZARD_FAMILIES: Record<string, string> = {
  flood: "water",
  flooding: "water",
  waterlogging: "water",
  tsunami: "water",
  cyclone: "storm",
  storm: "storm",
  fire: "fire",
  landslide: "earth",
  earthquake: "earth",
  building_collapse: "earth",
  road_blocked: "route",
  road_flooded: "water",
  medical: "medical",
  accident: "route",
};

export function sameHazardFamily(a: string, b: string): boolean {
  const fa = HAZARD_FAMILIES[a.toLowerCase()] ?? a.toLowerCase();
  const fb = HAZARD_FAMILIES[b.toLowerCase()] ?? b.toLowerCase();
  return fa === fb;
}

export function tierFor(score: number): {
  tier: VerificationTier;
  tierLabel: string;
} {
  if (score >= 80) return { tier: "verified", tierLabel: "Verified" };
  if (score >= 55) return { tier: "high_confidence", tierLabel: "High confidence" };
  if (score >= 25) return { tier: "reported", tierLabel: "Reported" };
  return { tier: "unverified", tierLabel: "Unverified" };
}

export const TIER_META: Record<
  VerificationTier,
  { emoji: string; tone: "amber" | "blue" | "orange" | "red"; blurb: string }
> = {
  unverified: { emoji: "🟡", tone: "amber", blurb: "Lead only — do not commit resources" },
  reported: { emoji: "⚪", tone: "blue", blurb: "Plausible — keep gathering signal" },
  high_confidence: { emoji: "🟠", tone: "orange", blurb: "Safe to pre-stage resources" },
  verified: { emoji: "🔴", tone: "red", blurb: "Confirmed — act on it" },
};

function buildSummary(
  tier: VerificationTier,
  uniqueDevices: number,
  incident: VerifiableIncident,
  officialConfirmed: boolean
): string {
  if (tier === "verified") {
    return officialConfirmed
      ? "Confirmed by a responder/authority alongside citizen reports."
      : `${uniqueDevices + 1} independent reports + evidence corroborate this.`;
  }
  if (tier === "high_confidence") {
    return `${uniqueDevices + 1} independent reports point to the same event.`;
  }
  if (tier === "reported") {
    return "Some supporting signal, but not yet independently confirmed.";
  }
  return "Single uncorroborated report — awaiting more signal.";
}
