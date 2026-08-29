import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { connectToDatabase } from "@/lib/mongodb";
import Report, { REPORT_TYPES } from "@/lib/models/Report";

const VERIFY_RADIUS_METERS = 200;
const VERIFY_WINDOW_MINUTES = 15;
const VERIFY_THRESHOLD_SESSIONS = 3;

export async function POST(req: NextRequest) {
  await connectToDatabase();

  const form = await req.formData();
  const session_id = form.get("session_id");
  const type = form.get("type");
  const description = form.get("description");
  const lat = form.get("lat");
  const lng = form.get("lng");
  const photo = form.get("photo");

  if (!session_id || !type || lat === null || lng === null) {
    return NextResponse.json(
      { error: "Missing required fields: session_id, type, lat, lng" },
      { status: 400 }
    );
  }

  if (!REPORT_TYPES.includes(type as (typeof REPORT_TYPES)[number])) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${REPORT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
    return NextResponse.json(
      { error: "Invalid lat: must be a number between -90 and 90" },
      { status: 400 }
    );
  }
  if (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    return NextResponse.json(
      { error: "Invalid lng: must be a number between -180 and 180" },
      { status: 400 }
    );
  }

  const descriptionStr = typeof description === "string" ? description : undefined;
  if (descriptionStr && descriptionStr.length > 500) {
    return NextResponse.json(
      { error: "Description must be 500 characters or fewer" },
      { status: 400 }
    );
  }

  let photo_url: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    const buffer = Buffer.from(await photo.arrayBuffer());
    const ext = path.extname(photo.name) || "";
    const filename = `photo-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    await writeFile(path.join(process.cwd(), "public", "uploads", filename), buffer);
    photo_url = `/uploads/${filename}`;
  }

  const report = await Report.create({
    session_id,
    type,
    description: descriptionStr ?? null,
    photo_url,
    location: { type: "Point", coordinates: [lngNum, latNum] },
    status: "unverified",
  });

  // Trust layer: auto-verify when 3+ distinct sessions report the same type nearby.
  const nearbyUnverified = await Report.find({
    status: "unverified",
    type,
    created_at: { $gte: new Date(Date.now() - VERIFY_WINDOW_MINUTES * 60 * 1000) },
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [lngNum, latNum] },
        $maxDistance: VERIFY_RADIUS_METERS,
      },
    },
  });

  const distinctSessions = new Set(nearbyUnverified.map((r) => r.session_id));

  const body: Record<string, unknown> = { report: report.toJSON() };

  if (distinctSessions.size >= VERIFY_THRESHOLD_SESSIONS) {
    const ids = nearbyUnverified.map((r) => r._id);
    await Report.updateMany({ _id: { $in: ids } }, { $set: { status: "verified" } });
    const verifiedReports = await Report.find({ _id: { $in: ids } });
    body.verifiedReports = verifiedReports.map((r) => r.toJSON());
  }

  return NextResponse.json(body, { status: 201 });
}

export async function GET(req: NextRequest) {
  await connectToDatabase();

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id query parameter" }, { status: 400 });
  }

  const reports = await Report.find({ session_id: sessionId }).sort({ created_at: -1 });
  return NextResponse.json(reports.map((r) => r.toJSON()));
}
