import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAuthority } from "@/lib/auth";
import {
  registerRecipient,
  getRecipients,
  type AlertAudience,
} from "@/lib/emergencyAlertStore";

const AUDIENCES: AlertAudience[] = ["citizens", "responders", "authorities"];

/**
 * Emergency SMS recipient directory (opt-in).
 *
 * POST — register a phone number for a given audience. Citizens self-register
 * their own number (with their SOS coordinates so they only get nearby alerts);
 * responder / authority numbers are seeded by an authority token.
 *
 * GET — list the directory (authority only; phone numbers are PII).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const audience: AlertAudience = AUDIENCES.includes(body.audience) ? body.audience : "citizens";
  const phone = String(body.phone || "").trim();
  if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });

  // Registering responders / authorities requires an authority token.
  if (audience !== "citizens" && !isAuthorizedAuthority(req)) {
    return NextResponse.json({ error: "Unauthorized for this audience" }, { status: 401 });
  }

  const recipient = registerRecipient({
    audience,
    phone,
    name: body.name ? String(body.name) : undefined,
    device_id: body.device_id ? String(body.device_id) : req.headers.get("x-device-id") || undefined,
    latitude: typeof body.lat === "number" ? body.lat : typeof body.latitude === "number" ? body.latitude : undefined,
    longitude: typeof body.lng === "number" ? body.lng : typeof body.longitude === "number" ? body.longitude : undefined,
  });

  // Never echo the stored phone list back to an unauthenticated caller.
  return NextResponse.json(
    { success: true, recipient: { id: recipient.id, audience: recipient.audience, registered_at: recipient.registered_at } },
    { status: 201 }
  );
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedAuthority(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const audienceParam = searchParams.get("audience");
  const audience = AUDIENCES.includes(audienceParam as AlertAudience)
    ? (audienceParam as AlertAudience)
    : undefined;
  return NextResponse.json({ recipients: getRecipients(audience) });
}
