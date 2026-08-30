import { NextResponse } from "next/server";
import { buildShortlist, resolveIncident } from "@/lib/allocationService";

/**
 * GET /api/incidents/:id/shortlist
 *
 * Ranks the live resource pool for one incident using distance, resource type,
 * availability, capacity and incident severity. The first entry flagged
 * `recommended` is the auto-allocation pick.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const incident = await resolveIncident(id);
    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const shortlist = await buildShortlist(incident.engine);
    return NextResponse.json(shortlist);
  } catch (err) {
    console.error("GET /api/incidents/[id]/shortlist error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to build shortlist" },
      { status: 500 }
    );
  }
}
