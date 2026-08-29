import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuthority } from "@/lib/auth";
import Report from "@/lib/models/Report";
import Resource from "@/lib/models/Resource";
import Allocation from "@/lib/models/Allocation";

export async function POST(req: NextRequest) {
  const unauthorized = requireAuthority(req);
  if (unauthorized) return unauthorized;

  await connectToDatabase();

  const { report_id, resource_id } = await req.json();

  if (!report_id || !resource_id) {
    return NextResponse.json(
      { error: "Missing required fields: report_id, resource_id" },
      { status: 400 }
    );
  }

  const report = await Report.findById(report_id);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  if (report.status === "in_progress" || report.status === "resolved") {
    return NextResponse.json(
      { error: "Report already in progress or resolved" },
      { status: 400 }
    );
  }
  if (report.status !== "verified") {
    return NextResponse.json({ error: "Report is not verified" }, { status: 400 });
  }

  const resource = await Resource.findById(resource_id);
  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }
  if (resource.status !== "available") {
    return NextResponse.json({ error: "Resource is not available" }, { status: 400 });
  }
  if (resource.capacity_used >= resource.capacity_total) {
    return NextResponse.json({ error: "Resource has no available capacity" }, { status: 400 });
  }

  // Atomically transition the report so a concurrent confirm can't double-dispatch it.
  const updatedReport = await Report.findOneAndUpdate(
    { _id: report_id, status: "verified" },
    { $set: { status: "in_progress" } },
    { new: true }
  );
  if (!updatedReport) {
    return NextResponse.json({ error: "Report is not verified" }, { status: 400 });
  }

  // Atomically re-check and reserve capacity on the resource.
  const updatedResource = await Resource.findOneAndUpdate(
    {
      _id: resource_id,
      status: "available",
      $expr: { $lt: ["$capacity_used", "$capacity_total"] },
    },
    { $inc: { capacity_used: 1 }, $set: { status: "en_route" } },
    { new: true }
  );
  if (!updatedResource) {
    await Report.updateOne({ _id: report_id }, { $set: { status: "verified" } });
    return NextResponse.json({ error: "Resource has no available capacity" }, { status: 400 });
  }

  let allocation;
  try {
    allocation = await Allocation.create({
      report_id,
      resource_id,
      status: "confirmed",
      recommended_at: new Date(),
      confirmed_at: new Date(),
      confirmed_by: "authority-1",
    });
  } catch (err) {
    await Report.updateOne({ _id: report_id }, { $set: { status: "verified" } });
    await Resource.updateOne(
      { _id: resource_id },
      { $inc: { capacity_used: -1 }, $set: { status: "available" } }
    );
    throw err;
  }

  return NextResponse.json(
    {
      allocation: allocation.toJSON(),
      report: updatedReport.toJSON(),
      resource: updatedResource.toJSON(),
    },
    { status: 201 }
  );
}
