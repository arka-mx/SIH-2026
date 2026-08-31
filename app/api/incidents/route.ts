import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ReportModel } from "@/lib/models/Report";
import { getAllRescueIncidents } from "@/lib/rescueStore";

export async function GET() {
  // The in-process rescue store is the live source of truth for citizen SOS
  // (create / resend / cancel). Always include it so the admin dashboard and the
  // rescue team head see the same state — including cancellations — even when
  // MongoDB is offline.
  const storeFormatted = getAllRescueIncidents().map((inc) => ({
    id: inc.id,
    session_id: inc.device_id,
    device_id: inc.device_id,
    type: inc.type,
    description: inc.description,
    reporter_name: inc.reporter_name,
    status: inc.status,
    severity: inc.severity,
    recommended_allocation: inc.recommended_allocation ?? null,
    created_at: inc.created_at,
    updated_at: inc.updated_at,
    lat: inc.latitude,
    lng: inc.longitude,
    location_wkt: inc.location_wkt || `POINT(${inc.longitude} ${inc.latitude})`,
    address: inc.address,
    assigned_rescuer: inc.assigned_rescuer,
    report_count: inc.report_count,
    verification: inc.verification,
    confirmations: inc.confirmations,
    has_photo: inc.has_photo,
    photo_url: inc.photo_url,
    ai_enrichment: inc.ai_enrichment ?? null,
  }));

  try {
    await connectToDatabase();
    const reports = await ReportModel.find().sort({ created_at: -1 });

    const formatted = reports.map((r: any) => ({
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

    const seen = new Set(storeFormatted.map((i) => i.id));
    return NextResponse.json([
      ...storeFormatted,
      ...formatted.filter((r: { id: string }) => !seen.has(r.id)),
    ]);
  } catch (err: any) {
    console.warn("MongoDB offline, serving rescue store only:", err);
    return NextResponse.json(storeFormatted);
  }
}
