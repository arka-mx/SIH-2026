import { NextRequest, NextResponse } from "next/server";
import { processRescueSubmission, SubmitRescuePayload } from "@/lib/rescueStore";
import { connectToDatabase } from "@/lib/mongodb";
import { IncidentModel } from "@/lib/models/Incident";
import { ReportEventModel } from "@/lib/models/ReportEvent";
import { ClientModel } from "@/lib/models/Client";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let device_id = req.headers.get("x-device-id") || "";
    let idempotency_key = req.headers.get("x-idempotency-key") || "";
    let type = "flood";
    let message = "";
    let latitude = 0;
    let longitude = 0;
    let location_accuracy = 10;
    let address = "";

    // Parse IP Address from headers
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip_address = forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";
    const user_agent = req.headers.get("user-agent") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      if (!device_id) device_id = (formData.get("device_id") as string) || (formData.get("session_id") as string) || "";
      if (!idempotency_key) idempotency_key = (formData.get("idempotency_key") as string) || "";
      type = (formData.get("type") as string) || "flood";
      message = (formData.get("description") as string) || (formData.get("message") as string) || "";
      latitude = parseFloat((formData.get("lat") as string) || (formData.get("latitude") as string) || "0");
      longitude = parseFloat((formData.get("lng") as string) || (formData.get("longitude") as string) || "0");
      address = (formData.get("address") as string) || "";
    } else {
      const body = await req.json();
      if (!device_id) device_id = body.device_id || body.session_id || "";
      if (!idempotency_key) idempotency_key = body.idempotency_key || "";
      type = body.type || "flood";
      message = body.message || body.description || "";
      latitude = typeof body.latitude === "number" ? body.latitude : parseFloat(body.lat || "0");
      longitude = typeof body.longitude === "number" ? body.longitude : parseFloat(body.lng || "0");
      location_accuracy = body.location_accuracy || 10;
      address = body.address || "";
    }

    if (!device_id || device_id.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required header/field: device_id" },
        { status: 400 }
      );
    }

    if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid location coordinates: latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Process Submission in Deduplication Engine
    const payload: SubmitRescuePayload = {
      device_id: device_id.trim(),
      type,
      message,
      latitude,
      longitude,
      location_accuracy,
      ip_address,
      user_agent,
      idempotency_key: idempotency_key.trim() || undefined,
      address,
    };

    const result = await processRescueSubmission(payload);

    // Sync with MongoDB asynchronously if connected
    try {
      await connectToDatabase();
      if (ClientModel) {
        await ClientModel.updateOne(
          { device_id: payload.device_id },
          { $set: { last_seen_at: new Date() }, $setOnInsert: { first_seen_at: new Date() } },
          { upsert: true }
        );
      }
      if (IncidentModel) {
        await IncidentModel.updateOne(
          { incident_id: result.incident_id },
          {
            $set: {
              device_id: payload.device_id,
              type: result.incident.type,
              description: result.incident.description,
              latitude: result.incident.latitude,
              longitude: result.incident.longitude,
              address: result.incident.address,
              status: result.incident.status,
              report_count: result.incident.report_count,
              updated_at: new Date(),
            },
            $setOnInsert: { created_at: new Date() },
          },
          { upsert: true }
        );
      }
      if (ReportEventModel && result.report) {
        await ReportEventModel.create({
          id: result.report.id,
          incident_id: result.incident_id,
          device_id: payload.device_id,
          type: result.report.type,
          message: result.report.message,
          latitude: result.report.latitude,
          longitude: result.report.longitude,
          ip_address: result.report.ip_address,
          user_agent: result.report.user_agent,
          idempotency_key: result.report.idempotency_key,
        });
      }
    } catch (dbErr) {
      console.warn("MongoDB sync skipped or offline:", dbErr);
    }

    const statusCode = result.action === "CREATED" ? 201 : 200;

    return NextResponse.json(
      {
        success: true,
        incident_id: result.incident_id,
        action: result.action,
        incident: result.incident,
        report: result.report,
      },
      { status: statusCode }
    );
  } catch (err: any) {
    console.error("POST /api/rescue/request error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process rescue request" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = req.headers.get("x-device-id") || searchParams.get("device_id");
    
    if (deviceId) {
      const active = (await import("@/lib/rescueStore")).getActiveIncidentForDevice(deviceId);
      return NextResponse.json({ success: true, incident: active });
    }

    const allIncidents = (await import("@/lib/rescueStore")).getAllRescueIncidents();
    return NextResponse.json({ success: true, incidents: allIncidents });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
