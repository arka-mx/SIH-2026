import { getRescueIncidentById } from "@/lib/rescueStore";
import { connectToDatabase } from "@/lib/mongodb";
import { IncidentModel } from "@/lib/models/Incident";
import { ReportModel } from "@/lib/models/Report";
import { getSafeShare } from "@/lib/safeShareStore";
import {
  SafeStatusView,
  parseDescription,
  normalizeStatus,
  rescuerLabel,
} from "@/lib/safeShare";

export type { SafeStatusView } from "@/lib/safeShare";

/**
 * Resolve a shared "/safe/<id>" identifier to a public status view.
 *
 * Lookup order:
 *  1. Published safe-share snapshot (what the citizen explicitly shared)
 *  2. In-process rescue store (keeps status fresh in a single-instance deploy)
 *  3. MongoDB `incidents` collection, keyed by the string incident id
 *  4. Legacy `reports` collection, keyed by Mongo ObjectId
 */
export async function resolveSafeStatus(id: string): Promise<SafeStatusView | null> {
  const trimmed = (id || "").trim();
  if (!trimmed) return null;

  // 1. Explicitly published snapshot
  const shared = await getSafeShare(trimmed);
  if (shared) {
    // If a live incident record exists, prefer its fresher status/rescuer info.
    const live = getRescueIncidentById(trimmed);
    if (live) {
      const status = normalizeStatus(live.status);
      return {
        ...shared,
        status,
        reportedSafe: shared.reportedSafe || status === "resolved",
        updatedAt: live.updated_at || shared.updatedAt,
        rescuer: rescuerLabel(live.assigned_rescuer) ?? shared.rescuer,
      };
    }
    return shared;
  }

  // 2. In-memory rescue store
  const mem = getRescueIncidentById(trimmed);
  if (mem) {
    const { placeLabel, reportedSafe, note } = parseDescription(mem.description);
    const status = normalizeStatus(mem.status);
    return {
      id: mem.incident_id || mem.id,
      type: mem.type,
      status,
      reportedSafe: reportedSafe || status === "resolved",
      lat: mem.latitude,
      lng: mem.longitude,
      locationLabel: mem.address || placeLabel || "Shared GPS location",
      note: note || undefined,
      createdAt: mem.created_at,
      updatedAt: mem.updated_at || mem.created_at,
      rescuer: rescuerLabel(mem.assigned_rescuer),
    };
  }

  // 3 & 4. Database fallbacks
  try {
    await connectToDatabase();

    if (IncidentModel) {
      const inc = await IncidentModel.findOne({ incident_id: trimmed }).lean();
      if (inc) {
        const { placeLabel, reportedSafe, note } = parseDescription(inc.description);
        const status = normalizeStatus(inc.status);
        return {
          id: inc.incident_id,
          type: inc.type,
          status,
          reportedSafe: reportedSafe || status === "resolved",
          lat: inc.latitude,
          lng: inc.longitude,
          locationLabel: inc.address || placeLabel || "Shared GPS location",
          note: note || undefined,
          createdAt: new Date(inc.created_at).toISOString(),
          updatedAt: new Date(inc.updated_at || inc.created_at).toISOString(),
          rescuer: rescuerLabel(inc.assigned_rescuer),
        };
      }
    }

    if (ReportModel && /^[a-f\d]{24}$/i.test(trimmed)) {
      const rep = await ReportModel.findById(trimmed).lean();
      if (rep) {
        const { placeLabel, reportedSafe, note } = parseDescription(rep.description);
        const status = normalizeStatus(rep.status);
        const coords = rep.location?.coordinates || [0, 0];
        return {
          id: String(rep._id),
          type: rep.type,
          status,
          reportedSafe: reportedSafe || status === "resolved",
          lat: coords[1],
          lng: coords[0],
          locationLabel: placeLabel || "Shared GPS location",
          note: note || undefined,
          createdAt: new Date(rep.created_at).toISOString(),
          updatedAt: new Date(rep.created_at).toISOString(),
          rescuer: null,
        };
      }
    }
  } catch (err) {
    console.warn("resolveSafeStatus: database lookup skipped or failed:", err);
  }

  return null;
}
