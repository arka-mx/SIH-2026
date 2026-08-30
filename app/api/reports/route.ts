import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ReportModel } from "@/lib/models/Report";
import { writeFile } from "fs/promises";
import path from "path";

// Haversine distance in meters
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
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

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const contentType = req.headers.get("content-type") || "";
    let session_id = "";
    let type = "";
    let description = "";
    let lat = 0;
    let lng = 0;
    let photo_url: string | undefined = undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      session_id = (formData.get("session_id") as string) || "";
      type = (formData.get("type") as string) || "";
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
      session_id = body.session_id;
      type = body.type;
      description = body.description;
      lat = body.lat;
      lng = body.lng;
      photo_url = body.photo_url;
    }

    if (!session_id || !type || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Missing required fields: session_id, type, lat, lng" },
        { status: 400 }
      );
    }

    const newReport = await ReportModel.create({
      session_id,
      type,
      description,
      photo_url,
      status: "unverified",
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
    } as Record<string, unknown>);

    // Check clustering: find unverified reports within ~200m and 15 mins
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const candidateReports = await ReportModel.find({
      type,
      status: "unverified",
      created_at: { $gte: fifteenMinsAgo },
    } as Record<string, unknown>);

    const nearbyCluster = candidateReports.filter((r) => {
      const [rLng, rLat] = r.location.coordinates;
      const dist = haversineMeters(lat, lng, rLat, rLng);
      return dist <= 200;
    });

    const distinctSessions = new Set(nearbyCluster.map((r) => r.session_id));

    let verifiedReports: any[] | undefined = undefined;

    if (distinctSessions.size >= 3) {
      const clusterIds = nearbyCluster.map((r) => r._id);
      await ReportModel.updateMany(
        { _id: { $in: clusterIds } },
        { $set: { status: "verified" } }
      );

      verifiedReports = await ReportModel.find({ _id: { $in: clusterIds } });
    }

    const formattedReport = {
      id: newReport._id.toString(),
      session_id: newReport.session_id,
      type: newReport.type,
      description: newReport.description,
      photo_url: newReport.photo_url,
      status: newReport.status,
      created_at: newReport.created_at,
      lat,
      lng,
      location_wkt: `POINT(${lng} ${lat})`,
    };

    return NextResponse.json(
      {
        report: formattedReport,
        verifiedReports: verifiedReports?.map((r) => ({
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
        })),
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/reports error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit report" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    const query = sessionId ? { session_id: sessionId } : {};
    const reports = await ReportModel.find(query).sort({ created_at: -1 });

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
    console.warn("MongoDB offline, returning empty server reports:", err);
    return NextResponse.json([]);
  }
}
