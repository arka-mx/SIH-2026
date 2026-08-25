import { Request, Response } from "express";
import { Server as SocketIOServer } from "socket.io";
import { createReport, getCitizenReportsBySession } from "../services/reportService";

export async function submitReport(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { session_id, type, lat, lng, description } = req.body;

    if (!session_id || !type || lat == null || lng == null) {
      res.status(400).json({
        error: "Missing required fields: session_id, type, lat, lng",
      });
      return;
    }

    let photo_url: string | undefined = undefined;
    if (req.file) {
      photo_url = `/uploads/${req.file.filename}`;
    }

    const result = await createReport({
      session_id,
      type,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      description,
      photo_url,
    });

    // Emit Socket.IO events
    const io: SocketIOServer | undefined = req.app.get("io");
    if (io) {
      io.emit("report_created", result.report);

      if (result.verifiedReports) {
        io.emit("report_verified", result.verifiedReports);
      }
    }

    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ Error creating report:", message);
    res.status(400).json({ error: message });
  }
}

export async function getCitizenReports(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      res.status(400).json({ error: "Missing session_id query parameter" });
      return;
    }

    const reports = await getCitizenReportsBySession(session_id as string);
    res.json(reports);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ Error fetching citizen reports:", message);
    res.status(500).json({ error: message });
  }
}
