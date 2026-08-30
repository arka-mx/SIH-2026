import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAuthority } from "@/lib/auth";
import {
  dispatchEmergencyAlert,
  getAlerts,
  type AlertAudience,
  type AlertCategory,
  type AlertSeverity,
  type DispatchEmergencyAlertInput,
} from "@/lib/emergencyAlertStore";

const AUDIENCES: AlertAudience[] = ["citizens", "responders", "authorities"];
const CATEGORIES: AlertCategory[] = [
  "disaster_verified",
  "evacuation",
  "resource_deployment",
  "shelter_allocation",
  "custom",
];
const SEVERITIES: AlertSeverity[] = ["critical", "high", "moderate", "low"];

/**
 * GET /api/alerts — in-app emergency notification feed.
 *
 * Query params:
 *   audience   citizens | responders | authorities
 *   device_id  (citizen scoping — currently informational, feed is per-audience)
 *   since      ISO timestamp — only alerts newer than this
 *   limit      max entries (default 50)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const audienceParam = searchParams.get("audience");
  const audience = AUDIENCES.includes(audienceParam as AlertAudience)
    ? (audienceParam as AlertAudience)
    : undefined;

  const alerts = getAlerts({
    audience,
    deviceId: searchParams.get("device_id") || undefined,
    since: searchParams.get("since") || undefined,
    limit: Number(searchParams.get("limit")) || undefined,
  });

  return NextResponse.json({ alerts });
}

/**
 * POST /api/alerts — manually trigger an emergency alert (authority only).
 *
 * Used by the admin console for evacuation orders, shelter allocations, and
 * ad-hoc broadcasts. The automatic triggers (verified disaster, resource
 * deployment) call `dispatchEmergencyAlert` directly from their own handlers.
 *
 * Body: {
 *   category, alert_type, severity, audiences: string[],
 *   location_name?, lat?, lng?, shelter?, instructions?, incident_id?,
 *   extra_phones?: string[]
 * }
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedAuthority(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const category: AlertCategory = CATEGORIES.includes(body.category) ? body.category : "custom";
  const severity: AlertSeverity = SEVERITIES.includes(body.severity) ? body.severity : "high";
  const alertType = String(body.alert_type || body.alertType || "").trim();
  if (!alertType) {
    return NextResponse.json({ error: "alert_type is required" }, { status: 400 });
  }

  const audiences: AlertAudience[] = Array.isArray(body.audiences)
    ? body.audiences.filter((a: string): a is AlertAudience => AUDIENCES.includes(a as AlertAudience))
    : [];
  if (audiences.length === 0) audiences.push("citizens");

  const lat = typeof body.lat === "number" ? body.lat : typeof body.latitude === "number" ? body.latitude : undefined;
  const lng = typeof body.lng === "number" ? body.lng : typeof body.longitude === "number" ? body.longitude : undefined;

  const input: DispatchEmergencyAlertInput = {
    category,
    alertType,
    severity,
    audiences,
    locationName: body.location_name || body.locationName || undefined,
    latitude: lat,
    longitude: lng,
    shelter: body.shelter || undefined,
    instructions: body.instructions || undefined,
    incidentId: body.incident_id || body.incidentId || undefined,
    extraPhones: Array.isArray(body.extra_phones) ? body.extra_phones.map(String) : undefined,
  };

  try {
    const alert = await dispatchEmergencyAlert(input);
    return NextResponse.json({ success: true, alert }, { status: 201 });
  } catch (err) {
    console.error("POST /api/alerts error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to dispatch alert" },
      { status: 500 }
    );
  }
}
