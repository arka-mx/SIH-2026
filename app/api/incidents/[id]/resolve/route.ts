import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAuthority } from "@/lib/auth";
import { getRescueIncidentById, updateRescueIncidentStatus } from "@/lib/rescueStore";
import { releaseAllocationForReport } from "@/lib/allocationService";

/**
 * POST /api/incidents/:id/resolve
 *
 * Closes an incident and hands any held resource capacity back to the pool.
 * Works against the in-memory rescue store first, then MongoDB.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAuthorizedAuthority(req)) {
      return NextResponse.json(
        { error: "Unauthorized authority token" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const closedAllocation = releaseAllocationForReport(id);

    // ── in-memory rescue store ──
    if (getRescueIncidentById(id)) {
      const updated = updateRescueIncidentStatus(id, "resolved", {
        rescuer_status: "arrived",
      });
      return NextResponse.json({
        report: { id, status: updated?.status || "resolved" },
        allocation: closedAllocation
          ? { id: closedAllocation.id, status: closedAllocation.status }
          : undefined,
      });
    }

    // ── MongoDB ──
    try {
      const { connectToDatabase } = await import("@/lib/mongodb");
      const { ReportModel } = await import("@/lib/models/Report");
      const { AllocationModel } = await import("@/lib/models/Allocation");
      const { ResourceModel } = await import("@/lib/models/Resource");
      await connectToDatabase();

      const report = await ReportModel.findByIdAndUpdate(
        id,
        { status: "resolved" },
        { new: true }
      );
      if (!report) {
        return NextResponse.json({ error: "Incident not found" }, { status: 404 });
      }

      const allocation = await AllocationModel.findOneAndUpdate(
        { report_id: id },
        { status: "resolved" },
        { new: true }
      );
      if (allocation) {
        await ResourceModel.findByIdAndUpdate(allocation.resource_id, {
          status: "available",
        });
      }

      return NextResponse.json({
        report: { id: report._id.toString(), status: report.status },
        allocation: allocation
          ? { id: allocation._id.toString(), status: allocation.status }
          : closedAllocation
          ? { id: closedAllocation.id, status: closedAllocation.status }
          : undefined,
      });
    } catch (err) {
      if (closedAllocation) {
        return NextResponse.json({
          report: { id, status: "resolved" },
          allocation: { id: closedAllocation.id, status: closedAllocation.status },
        });
      }
      throw err;
    }
  } catch (err) {
    console.error("POST /api/incidents/[id]/resolve error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to resolve incident" },
      { status: 500 }
    );
  }
}
