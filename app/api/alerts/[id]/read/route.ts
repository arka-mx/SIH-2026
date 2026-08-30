import { NextRequest, NextResponse } from "next/server";
import { markAlertRead } from "@/lib/emergencyAlertStore";

/**
 * POST /api/alerts/[id]/read — mark an in-app alert read.
 *
 * The reader key is the citizen device id (header `x-device-id` or body
 * `device_id`) or, for responder/authority consoles, the audience name.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const readerKey =
    req.headers.get("x-device-id") ||
    body?.device_id ||
    body?.reader_key ||
    body?.audience ||
    "";

  const alert = markAlertRead(id, String(readerKey));
  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, alert });
}
