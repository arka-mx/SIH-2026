import { NextRequest, NextResponse } from "next/server";
import { processRescueSubmission } from "@/lib/rescueStore";
import { connectToDatabase } from "@/lib/mongodb";
import { ReportModel } from "@/lib/models/Report";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let device_id = req.headers.get("x-device-id") || "";
    let idempotency_key = req.headers.get("x-idempotency-key") || "";
    let type = "flood";
    let description = "";
    let lat = 0;
    let lng = 0;
    let photo_url: string | undefined = undefined;

    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip_address = forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";
    const user_agent = req.headers.get("user-agent") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      if (!device_id) device_id = (formData.get("device_id") as string) || (formData.get("session_id") as string) || "";
      if (!idempotency_key) idempotency_key = (formData.get("idempotency_key") as string) || "";
      type = (formData.get("type") as string) || "flood";
      description = (formData.get("description") as string) || "";
      lat = parseFloat((formData.get("lat") as string) || "0");
      lng = parseFloat((formData.get("lng") as string) || "0");

      const photoFile = formData.get("photo") as File | null;
      if (photoFile && photoFile.name) {
        const bytes = await photoFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `photo-${Date.now()}-${photoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filePath = path.join(process.cwd(), "public", "uploads", filename);
        await writeFile(filePath, buffer);
        photo_url = `/uploads/${filename}`;
      }
    } else {
      const body = await req.json();
      if (!device_id) device_id = body.device_id || body.session_id || "";
      if (!idempotency_key) idempotency_key = body.idempotency_key || "";
      type = body.type || "flood";
      description = body.description || "";
      lat = body.lat || 0;
      lng = body.lng || 0;
      photo_url = body.photo_url;
    }

    if (!device_id || !type || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      return NextResponse.json(
        { error: "Missing required fields: device_id, type, lat, lng" },
        { status: 400 }
      );
    }

    const result = await processRescueSubmission({
      device_id,
      type,
      message: description,
      latitude: lat,
      longitude: lng,
      ip_address,
      user_agent,
      idempotency_key,
    });

    const formattedReport = {
      id: result.incident.id,
      session_id: device_id,
      device_id,
      type: result.incident.type,
      description: result.incident.description,
      photo_url,
      status: result.incident.status,
      created_at: result.incident.created_at,
      lat,
      lng,
      location_wkt: `POINT(${lng} ${lat})`,
      action: result.action,
      reports: result.incident.reports,
      report_count: result.incident.report_count,
    };

    return NextResponse.json({ report: formattedReport, action: result.action }, { status: result.action === "CREATED" ? 201 : 200 });
  } catch (err: any) {
    console.error("POST /api/reports error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit report" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = req.headers.get("x-device-id") || searchParams.get("device_id") || searchParams.get("session_id");

    const allIncidents = (await import("@/lib/rescueStore")).getAllRescueIncidents();
    const filtered = deviceId ? allIncidents.filter((i) => i.device_id === deviceId) : allIncidents;

    const formatted = filtered.map((inc) => ({
      id: inc.id,
      session_id: inc.device_id,
      device_id: inc.device_id,
      type: inc.type,
      description: inc.description,
      status: inc.status,
      created_at: inc.created_at,
      lat: inc.latitude,
      lng: inc.longitude,
      location_wkt: inc.location_wkt,
      reports: inc.reports,
      report_count: inc.report_count,
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.warn("Error fetching reports:", err);
    return NextResponse.json([]);
  }
}
