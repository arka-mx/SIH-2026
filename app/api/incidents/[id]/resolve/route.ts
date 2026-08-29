import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ReportModel } from "@/lib/models/Report";
import { AllocationModel } from "@/lib/models/Allocation";
import { ResourceModel } from "@/lib/models/Resource";
import { isAuthorizedAuthority } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAuthorizedAuthority(req)) {
      return NextResponse.json({ error: "Unauthorized authority token" }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    const report = await ReportModel.findByIdAndUpdate(
      id,
      { status: "resolved" },
      { new: true }
    );

    if (!report) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // Find allocation and update resource status
    const allocation = await AllocationModel.findOneAndUpdate(
      { report_id: id },
      { status: "resolved" },
      { new: true }
    );

    let resource = null;
    if (allocation) {
      resource = await ResourceModel.findByIdAndUpdate(
        allocation.resource_id,
        { status: "available" },
        { new: true }
      );
    }

    return NextResponse.json({
      report: {
        id: report._id.toString(),
        session_id: report.session_id,
        type: report.type,
        status: report.status,
      },
      allocation: allocation ? { id: allocation._id.toString(), status: allocation.status } : undefined,
      resource: resource ? { id: resource._id.toString(), status: resource.status } : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to resolve incident" }, { status: 500 });
  }
}
