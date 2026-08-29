import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuthority } from "@/lib/auth";
import Report from "@/lib/models/Report";
import Resource from "@/lib/models/Resource";
import Allocation from "@/lib/models/Allocation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAuthority(req);
  if (unauthorized) return unauthorized;

  await connectToDatabase();
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const existing = await Report.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  if (existing.status === "resolved") {
    return NextResponse.json({ error: "Incident already resolved" }, { status: 400 });
  }
  if (existing.status !== "in_progress") {
    return NextResponse.json({ error: "Report is not in_progress" }, { status: 400 });
  }

  const report = await Report.findOneAndUpdate(
    { _id: id, status: "in_progress" },
    { $set: { status: "resolved" } },
    { new: true }
  );
  if (!report) {
    return NextResponse.json({ error: "Report is not in_progress" }, { status: 400 });
  }

  const activeAllocation = await Allocation.findOne({
    report_id: id,
    status: { $in: ["confirmed", "en_route", "at_scene"] },
  }).sort({ created_at: -1 });

  let allocation = null;
  let resource = null;

  if (activeAllocation) {
    allocation = await Allocation.findOneAndUpdate(
      { _id: activeAllocation._id },
      { $set: { status: "resolved" } },
      { new: true }
    );

    resource = await Resource.findOneAndUpdate(
      { _id: activeAllocation.resource_id, capacity_used: { $gt: 0 } },
      { $inc: { capacity_used: -1 }, $set: { status: "available" } },
      { new: true }
    );
    if (!resource) {
      resource = await Resource.findById(activeAllocation.resource_id);
    }
  }

  return NextResponse.json({
    report: report.toJSON(),
    allocation: allocation ? allocation.toJSON() : {},
    resource: resource ? resource.toJSON() : {},
  });
}
