import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Report from "@/lib/models/Report";
import Resource from "@/lib/models/Resource";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectToDatabase();
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const report = await Report.findById(id);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report.status !== "verified") {
    return NextResponse.json({ error: "Report is not verified" }, { status: 400 });
  }

  const resources = await Resource.aggregate([
    {
      $geoNear: {
        near: report.location,
        distanceField: "distance_meters",
        spherical: true,
      },
    },
    {
      $match: {
        $expr: { $lt: ["$capacity_used", "$capacity_total"] },
        disaster_types: report.type,
      },
    },
    { $limit: 3 },
  ]);

  const shortlist = resources.map((r) => ({
    id: r._id.toString(),
    name: r.name,
    type: r.type,
    capacity_total: r.capacity_total,
    capacity_used: r.capacity_used,
    disaster_types: r.disaster_types,
    status: r.status,
    distance_meters: r.distance_meters,
  }));

  return NextResponse.json(shortlist);
}
