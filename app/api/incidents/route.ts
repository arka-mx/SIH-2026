import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ReportModel } from "@/lib/models/Report";

export async function GET() {
  try {
    await connectToDatabase();
    const reports = await ReportModel.find().sort({ created_at: -1 });

    const formatted = reports.map((r) => ({
      id: r._id.toString(),
      session_id: r.session_id,
      type: r.type,
      description: r.description,
      photo_url: r.photo_url,
      status: r.status,
      created_at: r.created_at,
      lat: r.location.coordinates[1],
      lng: r.location.coordinates[0],
      location_wkt: `POINT(${r.location.coordinates[0]} ${r.location.coordinates[1]})`,
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch incidents" }, { status: 500 });
  }
}
