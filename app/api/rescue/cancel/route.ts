import { NextRequest, NextResponse } from "next/server";
import { cancelActiveIncidentsForDevice } from "@/lib/rescueStore";
import { connectToDatabase } from "@/lib/mongodb";
import { IncidentModel } from "@/lib/models/Incident";

/**
 * Abort a citizen's active SOS.
 *
 * Called when the citizen taps "Cancel SOS" or shares an "I'm safe" check-in.
 * Every active incident for the device is moved to `cancelled` in the shared
 * rescue store, which is what the admin dashboard and the rescue team head poll —
 * so the request disappears from their queues automatically.
 */
export async function POST(req: NextRequest) {
  try {
    let device_id = req.headers.get("x-device-id") || "";
    let reason = "";
    let source: "citizen_cancel" | "citizen_safe" = "citizen_cancel";

    const body = await req.json().catch(() => null);
    if (body) {
      device_id = device_id || body.device_id || body.session_id || "";
      reason = body.reason || "";
      if (body.source === "citizen_safe") source = "citizen_safe";
    }

    if (!device_id || device_id.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required header/field: device_id" },
        { status: 400 }
      );
    }

    const resolvedReason =
      reason ||
      (source === "citizen_safe"
        ? "Citizen reported safe — SOS aborted"
        : "Citizen cancelled the SOS");

    const cancelled = cancelActiveIncidentsForDevice(device_id.trim(), resolvedReason, source);

    // Best-effort DB mirror so a page reload after a restart still sees cancelled.
    try {
      await connectToDatabase();
      if (IncidentModel && cancelled.length > 0) {
        await IncidentModel.updateMany(
          { incident_id: { $in: cancelled.map((c) => c.incident_id) } },
          { $set: { status: "cancelled", updated_at: new Date() } }
        );
      }
    } catch (dbErr) {
      console.warn("MongoDB cancel sync skipped or offline:", dbErr);
    }

    return NextResponse.json({
      success: true,
      cancelled_count: cancelled.length,
      incidents: cancelled,
    });
  } catch (err: any) {
    console.error("POST /api/rescue/cancel error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to cancel rescue request" },
      { status: 500 }
    );
  }
}
