import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ReportModel } from "@/lib/models/Report";
import { ResourceModel } from "@/lib/models/Resource";

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const report = await ReportModel.findById(id);
    if (!report) {
      return NextResponse.json({ error: "Incident report not found" }, { status: 404 });
    }

    const [incLng, incLat] = report.location.coordinates;
    const incType = report.type.toLowerCase();

    // Query available resources that match disaster type and have remaining capacity
    const allResources = await ResourceModel.find({
      status: "available",
      $expr: { $lt: ["$capacity_used", "$capacity_total"] },
    });

    // Filter by suitability & sort by distance
    const matched = allResources.filter((r) => {
      if (!r.disaster_types || r.disaster_types.length === 0) return true;
      return r.disaster_types.some((dt) => dt.toLowerCase() === incType);
    });

    const resourcesWithDistance = matched.map((r) => {
      const [resLng, resLat] = r.location.coordinates;
      const distMeters = haversineMeters(incLat, incLng, resLat, resLng);
      return {
        id: r._id.toString(),
        name: r.name,
        type: r.type,
        capacity_total: r.capacity_total,
        capacity_used: r.capacity_used,
        status: r.status,
        disaster_types: r.disaster_types,
        distance_meters: Math.round(distMeters),
        lat: resLat,
        lng: resLng,
        location_wkt: `POINT(${resLng} ${resLat})`,
      };
    });

    resourcesWithDistance.sort((a, b) => a.distance_meters - b.distance_meters);

    return NextResponse.json(resourcesWithDistance.slice(0, 3));
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch shortlist" }, { status: 500 });
  }
}
