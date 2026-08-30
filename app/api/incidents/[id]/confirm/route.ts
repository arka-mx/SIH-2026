import { NextRequest, NextResponse } from "next/server";
import {
  addIncidentConfirmation,
  setIncidentManualVerification,
} from "@/lib/rescueStore";

/**
 * Cross-verification endpoint for the Report Verification System.
 *
 * A nearby citizen, a responder on scene, or an authority confirms that a
 * reported incident is real. Each confirmation feeds the confidence score and
 * can progressively promote the incident's status (Unverified → Verified).
 *
 * Body: { by: "citizen" | "responder" | "authority" | "admin",
 *         actor_id?, actor_name?, note?, lat?, lng?,
 *         manual_verified?: boolean }   // admin hard-vouch / retract
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const by = String(body.by || "citizen").toLowerCase();
    if (!["citizen", "responder", "authority", "admin"].includes(by)) {
      return NextResponse.json({ error: "Invalid confirmer role" }, { status: 400 });
    }

    if (typeof body.manual_verified === "boolean") {
      const updated = setIncidentManualVerification(id, body.manual_verified);
      if (!updated) {
        return NextResponse.json({ error: "Incident not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        incident_id: updated.incident_id,
        verification: updated.verification,
        status: updated.status,
      });
    }

    const updated = addIncidentConfirmation(id, {
      by: by as "citizen" | "responder" | "authority" | "admin",
      actor_id: body.actor_id,
      actor_name: body.actor_name,
      note: body.note,
      latitude: typeof body.lat === "number" ? body.lat : body.latitude,
      longitude: typeof body.lng === "number" ? body.lng : body.longitude,
    });

    if (!updated) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      incident_id: updated.incident_id,
      status: updated.status,
      confirmations: updated.confirmations,
      verification: updated.verification,
    });
  } catch (err: any) {
    console.error("POST /api/incidents/[id]/confirm error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to confirm incident" },
      { status: 500 }
    );
  }
}
