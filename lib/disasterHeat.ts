import { ReportItem, calcDistanceKm } from "@/lib/api";

/**
 * Scoring model for the Admin Disaster Heatmap.
 *
 * A citizen report has no explicit "severity" column, so we derive a single
 * heat weight (roughly 0–3) from the signals we do have:
 *   - disaster type          → intrinsic hazard to life
 *   - status                 → verified / active incidents matter more than noise
 *   - report / cluster count  → proxy for affected population (many calls, one area)
 *   - "Injured: N" in the SOS text → casualty load
 *   - recency                → urgency decays as an incident ages / gets handled
 *
 * The weights feed both the MapLibre `heatmap` layer and the ranked
 * "high-risk zones" side panel.
 */

export interface HeatPoint {
  id: string;
  lat: number;
  lng: number;
  type: string;
  status: string;
  weight: number;
  address?: string;
  description?: string;
  createdAt: string;
  reports: number;
  injured: number;
  ageHours: number;
}

const TYPE_HAZARD: Record<string, number> = {
  earthquake: 1.0,
  fire: 1.0,
  building_collapse: 1.0,
  medical: 0.9,
  cyclone: 0.9,
  flood: 0.8,
  landslide: 0.8,
  tsunami: 1.0,
  gas_leak: 0.9,
  accident: 0.7,
  stranded: 0.6,
};

function parseInjured(description?: string): number {
  if (!description) return 0;
  const m = description.match(/injured\s*:?\s*(\d+)/i);
  return m ? Math.min(parseInt(m[1], 10) || 0, 20) : 0;
}

export function coordsOf(inc: ReportItem): { lat: number; lng: number } | null {
  let lat = inc.lat;
  let lng = inc.lng;
  if ((lat === undefined || lng === undefined) && inc.location_wkt) {
    const match = inc.location_wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      lng = parseFloat(match[1]);
      lat = parseFloat(match[2]);
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

export function toHeatPoint(inc: ReportItem, now = Date.now()): HeatPoint | null {
  if (inc.status === "cancelled") return null;
  const c = coordsOf(inc);
  if (!c) return null;

  const hazard = TYPE_HAZARD[(inc.type || "").toLowerCase()] ?? 0.55;

  const statusFactor =
    inc.status === "in_progress"
      ? 1.0
      : inc.status === "verified"
      ? 1.0
      : inc.status === "resolved"
      ? 0.2
      : 0.7; // unverified / other

  const reports = Math.max(inc.report_count || inc.cluster_count || 1, 1);
  const crowdBoost = Math.min(reports - 1, 6) * 0.18; // affected-population proxy

  const injured = parseInjured(inc.description);
  const injuryBoost = Math.min(injured, 12) * 0.09;

  const ageHours = Math.max((now - new Date(inc.created_at).getTime()) / 3_600_000, 0);
  const urgencyFactor =
    ageHours < 1 ? 1.35 : ageHours < 6 ? 1.15 : ageHours < 24 ? 1.0 : 0.7;

  // Report Verification System: an unverified single report should not pull
  // resources the way a cross-verified one does.
  const confidenceFactor = inc.verification
    ? inc.verification.tier === "verified"
      ? 1.1
      : inc.verification.tier === "high_confidence"
      ? 0.9
      : inc.verification.tier === "reported"
      ? 0.7
      : 0.45
    : 1.0;

  const weight = Math.max(
    0,
    Math.min(
      (hazard + crowdBoost + injuryBoost) * statusFactor * urgencyFactor * confidenceFactor,
      3
    )
  );

  return {
    id: inc.id,
    lat: c.lat,
    lng: c.lng,
    type: inc.type || "incident",
    status: inc.status,
    weight: Math.round(weight * 100) / 100,
    address: inc.address,
    description: inc.description,
    createdAt: inc.created_at,
    reports,
    injured,
    ageHours,
  };
}

export function buildHeatPoints(incidents: ReportItem[], now = Date.now()): HeatPoint[] {
  return incidents
    .map((i) => toHeatPoint(i, now))
    .filter((p): p is HeatPoint => p !== null);
}

export interface HeatZone {
  key: string;
  lat: number;
  lng: number;
  points: HeatPoint[];
  intensity: number; // summed weight
  peak: number; // max single weight
  reports: number;
  injured: number;
  types: string[];
  label: string;
  distanceKm: number | null;
}

/**
 * Bin points into ~`cellKm` geographic cells and rank the resulting zones by
 * total heat intensity. `base` (the admin's operating location) is used only to
 * annotate each zone with a distance — it does not filter anything out.
 */
export function clusterZones(
  points: HeatPoint[],
  base?: { lat: number; lng: number } | null,
  cellKm = 2
): HeatZone[] {
  const latCell = cellKm / 110.574;
  const zones = new Map<string, HeatZone>();

  for (const p of points) {
    const lngCell = cellKm / (111.32 * Math.cos((p.lat * Math.PI) / 180) || 1);
    const gx = Math.round(p.lng / lngCell);
    const gy = Math.round(p.lat / latCell);
    const key = `${gx}:${gy}`;

    let z = zones.get(key);
    if (!z) {
      z = {
        key,
        lat: 0,
        lng: 0,
        points: [],
        intensity: 0,
        peak: 0,
        reports: 0,
        injured: 0,
        types: [],
        label: "",
        distanceKm: null,
      };
      zones.set(key, z);
    }
    z.points.push(p);
    z.intensity += p.weight;
    z.peak = Math.max(z.peak, p.weight);
    z.reports += p.reports;
    z.injured += p.injured;
    if (!z.types.includes(p.type)) z.types.push(p.type);
  }

  const out = Array.from(zones.values()).map((z) => {
    // Weight-centroid so the marker sits on the hottest part of the cell.
    const totalW = z.points.reduce((s, p) => s + p.weight, 0) || z.points.length;
    z.lat = z.points.reduce((s, p) => s + p.lat * (p.weight || 1), 0) / totalW;
    z.lng = z.points.reduce((s, p) => s + p.lng * (p.weight || 1), 0) / totalW;
    z.label =
      z.points.find((p) => p.address)?.address ||
      `${z.lat.toFixed(3)}, ${z.lng.toFixed(3)}`;
    z.distanceKm =
      base && Number.isFinite(base.lat) && Number.isFinite(base.lng)
        ? Math.round(calcDistanceKm(base.lat, base.lng, z.lat, z.lng) * 10) / 10
        : null;
    return z;
  });

  return out.sort((a, b) => b.intensity - a.intensity);
}

export function riskTier(intensity: number): {
  label: string;
  tone: "red" | "amber" | "blue";
} {
  if (intensity >= 4) return { label: "Severe", tone: "red" };
  if (intensity >= 2) return { label: "Elevated", tone: "amber" };
  return { label: "Moderate", tone: "blue" };
}
