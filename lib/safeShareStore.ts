import { connectToDatabase } from "@/lib/mongodb";
import { SafeShareModel } from "@/lib/models/SafeShare";
import { SafeStatusView, normalizeStatus } from "@/lib/safeShare";

/**
 * Server-side store for published "I'm safe" check-ins.
 *
 * A check-in only becomes publicly reachable once the citizen explicitly taps
 * "Share I'm safe link" — that publishes a snapshot here. This works even when
 * the rescue backend / MongoDB is offline, because the primary store is an
 * in-process map; MongoDB is a best-effort durability layer.
 */

const globalKey = "__momentum_safe_shares__";
const g = global as unknown as Record<string, Map<string, SafeStatusView>>;
const memory: Map<string, SafeStatusView> = g[globalKey] || (g[globalKey] = new Map());

export async function putSafeShare(snapshot: SafeStatusView): Promise<SafeStatusView> {
  const clean: SafeStatusView = {
    ...snapshot,
    status: normalizeStatus(snapshot.status),
    updatedAt: snapshot.updatedAt || new Date().toISOString(),
  };
  memory.set(clean.id, clean);

  try {
    await connectToDatabase();
    if (SafeShareModel) {
      await SafeShareModel.updateOne(
        { share_id: clean.id },
        {
          $set: {
            type: clean.type,
            status: clean.status,
            reported_safe: clean.reportedSafe,
            lat: clean.lat,
            lng: clean.lng,
            location_label: clean.locationLabel,
            note: clean.note,
            rescuer: clean.rescuer,
            source_created_at: clean.createdAt ? new Date(clean.createdAt) : undefined,
            source_updated_at: clean.updatedAt ? new Date(clean.updatedAt) : undefined,
          },
        },
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn("putSafeShare: MongoDB persistence skipped:", err);
  }

  return clean;
}

export async function getSafeShare(id: string): Promise<SafeStatusView | null> {
  const trimmed = (id || "").trim();
  if (!trimmed) return null;

  const mem = memory.get(trimmed);
  if (mem) return mem;

  try {
    await connectToDatabase();
    if (SafeShareModel) {
      const doc = await SafeShareModel.findOne({ share_id: trimmed }).lean();
      if (doc) {
        const view: SafeStatusView = {
          id: doc.share_id,
          type: doc.type,
          status: normalizeStatus(doc.status),
          reportedSafe: Boolean(doc.reported_safe),
          lat: doc.lat,
          lng: doc.lng,
          locationLabel: doc.location_label || "Shared GPS location",
          note: doc.note || undefined,
          createdAt: new Date(doc.source_created_at || doc.shared_at).toISOString(),
          updatedAt: new Date(doc.source_updated_at || doc.refreshed_at).toISOString(),
          rescuer: doc.rescuer || null,
        };
        memory.set(view.id, view);
        return view;
      }
    }
  } catch (err) {
    console.warn("getSafeShare: MongoDB lookup skipped:", err);
  }

  return null;
}
