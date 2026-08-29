import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ResourceModel } from "@/lib/models/Resource";

export async function GET() {
  try {
    await connectToDatabase();
    const resources = await ResourceModel.find().sort({ created_at: 1 });

    const formatted = resources.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      type: r.type,
      capacity_total: r.capacity_total,
      capacity_used: r.capacity_used,
      status: r.status,
      disaster_types: r.disaster_types,
      created_at: r.created_at,
      lat: r.location.coordinates[1],
      lng: r.location.coordinates[0],
      location_wkt: `POINT(${r.location.coordinates[0]} ${r.location.coordinates[1]})`,
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch resources" }, { status: 500 });
  }
}
