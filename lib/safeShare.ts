/**
 * Pure helpers + types for the citizen "Share I'm safe link" feature.
 *
 * No server-only imports here (no mongoose, no rescueStore) so this module is
 * safe to use from client components as well as API routes and server pages.
 */

export type SafeStatusValue =
  | "unverified"
  | "verified"
  | "in_progress"
  | "resolved"
  | "cancelled";

/**
 * Public, share-safe view of a citizen's emergency check-in.
 *
 * Deliberately omits anything that could identify the person or their device
 * (device_id, IP address, user agent, raw report events). Only what a family
 * member needs: where they were, what happened, and whether help has reached them.
 */
export interface SafeStatusView {
  id: string;
  type: string;
  status: SafeStatusValue;
  /** Citizen explicitly ticked "I am currently in a safe location", or the incident is resolved. */
  reportedSafe: boolean;
  lat: number;
  lng: number;
  locationLabel: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  rescuer?: { label: string; status?: string } | null;
}

/** Shape the citizen client knows about a report/incident it created. */
export interface ReportLike {
  id: string;
  type?: string;
  status?: string;
  description?: string;
  message?: string;
  address?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  location_wkt?: string;
  created_at?: string;
  updated_at?: string;
  assigned_rescuer?: unknown;
}

/** Pull the "[Place | Region: ...] ... Safe: Yes" convention the citizen form encodes into `description`. */
export function parseDescription(description?: string) {
  const desc = description || "";
  const bracket = desc.match(/^\[(.+?)\]/);
  const placeLabel = bracket ? bracket[1].split("|")[0].trim() : "";
  const reportedSafe = /safe:\s*yes/i.test(desc);
  const note = bracket ? desc.slice(bracket[0].length).trim() : desc.trim();
  return { placeLabel, reportedSafe, note };
}

export function normalizeStatus(status?: string): SafeStatusValue {
  switch (status) {
    case "verified":
    case "in_progress":
    case "resolved":
    case "cancelled":
      return status;
    default:
      return "unverified";
  }
}

export function rescuerLabel(assigned: unknown): SafeStatusView["rescuer"] {
  if (!assigned || typeof assigned !== "object") return null;
  const a = assigned as Record<string, unknown>;
  const label =
    (a.callsign as string) || (a.name as string) || (a.leaderName as string) || "Rescue unit";
  return { label, status: a.status as string | undefined };
}

function coordsFromWkt(wkt?: string): [number, number] | null {
  if (!wkt) return null;
  const m = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!m) return null;
  return [parseFloat(m[2]), parseFloat(m[1])]; // [lat, lng]
}

/** Build the share snapshot the client publishes when the citizen taps "Share I'm safe link". */
export function buildSafeSnapshot(report: ReportLike): SafeStatusView {
  const description = report.description || report.message;
  const { placeLabel, reportedSafe, note } = parseDescription(description);
  const status = normalizeStatus(report.status);

  let lat = typeof report.lat === "number" ? report.lat : report.latitude ?? NaN;
  let lng = typeof report.lng === "number" ? report.lng : report.longitude ?? NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const fromWkt = coordsFromWkt(report.location_wkt);
    if (fromWkt) [lat, lng] = fromWkt;
  }
  // The public view type requires numbers, and JSON.stringify turns NaN into
  // null — which fails isSafeSnapshot on the server and 404s the shared link.
  // Fall back to 0 (the /safe page treats 0,0 as "location not shared").
  if (!Number.isFinite(lat)) lat = 0;
  if (!Number.isFinite(lng)) lng = 0;

  const now = new Date().toISOString();
  return {
    id: report.id,
    type: report.type || "other",
    status,
    reportedSafe: reportedSafe || status === "resolved",
    lat,
    lng,
    locationLabel: report.address || placeLabel || "Shared GPS location",
    note: note || undefined,
    createdAt: report.created_at || now,
    updatedAt: report.updated_at || now,
    rescuer: rescuerLabel(report.assigned_rescuer),
  };
}

/** Runtime guard for payloads arriving at the API. */
export function isSafeSnapshot(v: unknown): v is SafeStatusView {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    o.id.length > 0 &&
    typeof o.type === "string" &&
    typeof o.status === "string" &&
    typeof o.lat === "number" &&
    typeof o.lng === "number" &&
    typeof o.locationLabel === "string"
  );
}
