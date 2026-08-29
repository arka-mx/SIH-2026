import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ReportModel } from "@/lib/models/Report";
import { ResourceModel } from "@/lib/models/Resource";
import { AllocationModel } from "@/lib/models/Allocation";
import { isAuthorizedAuthority } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorizedAuthority(req)) {
      return NextResponse.json({ error: "Unauthorized authority token" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { report_id, resource_id } = body;

    if (!report_id || !resource_id) {
      return NextResponse.json({ error: "Missing required fields: report_id, resource_id" }, { status: 400 });
    }

    const report = await ReportModel.findByIdAndUpdate(
      report_id,
      { status: "in_progress" },
      { new: true }
    );

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const resource = await ResourceModel.findById(resource_id);
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Increment capacity_used and update resource status
    resource.capacity_used = Math.min(resource.capacity_total, resource.capacity_used + 1);
    resource.status = "en_route";
    await resource.save();

    const allocation = await AllocationModel.create({
      report_id,
      resource_id,
      status: "confirmed",
      confirmed_at: new Date(),
      confirmed_by: "authority",
    });

    return NextResponse.json(
      {
        allocation: {
          id: allocation._id.toString(),
          report_id: allocation.report_id,
          resource_id: allocation.resource_id,
          status: allocation.status,
          confirmed_at: allocation.confirmed_at,
        },
        report: {
          id: report._id.toString(),
          status: report.status,
        },
        resource: {
          id: resource._id.toString(),
          name: resource.name,
          capacity_used: resource.capacity_used,
          capacity_total: resource.capacity_total,
          status: resource.status,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to confirm allocation" }, { status: 500 });
  }
}
