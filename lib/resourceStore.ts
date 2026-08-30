import type { EngineResource } from "@/lib/allocationEngine";
import { headroomOf } from "@/lib/allocationEngine";

/**
 * Live Resource Pool
 * ==================
 * The single server-side source of truth for the resource layer of the admin
 * map: shelters, rescue teams, medical units, boats and relief stock, with
 * their location, capacity and current status (available / en_route / at_scene).
 *
 * It seeds itself synchronously from a demo pool so the console works with no
 * database, then upgrades from MongoDB in the background if one is reachable.
 * Every allocation mutates this store, and (when the rows came from Mongo) is
 * written back through best-effort.
 */

export interface StoredResource extends EngineResource {
  location_wkt: string;
  updated_at: string;
  /** Present only when this row is backed by a MongoDB document. */
  mongo_id?: string;
}

export type ResourceStatus = "available" | "en_route" | "at_scene";

function wkt(lng: number, lat: number): string {
  return `POINT(${lng} ${lat})`;
}

// Demo pool — mirrors lib/api.ts FALLBACK_RESOURCES so the client and server
// agree when Mongo is offline, with a few extra unit types for a fuller map.
function seedPool(): StoredResource[] {
  const now = new Date().toISOString();
  const raw: Omit<StoredResource, "location_wkt" | "updated_at">[] = [
    {
      id: "res-shelter-main",
      name: "Government Community Disaster Shelter Camp",
      type: "shelter",
      capacity_total: 600,
      capacity_used: 190,
      status: "available",
      disaster_types: ["flood", "cyclone", "fire", "landslide"],
      lat: 19.33,
      lng: 84.81,
    },
    {
      id: "res-shelter-school",
      name: "Zilla School Relief Shelter",
      type: "shelter",
      capacity_total: 300,
      capacity_used: 40,
      status: "available",
      disaster_types: ["flood", "cyclone", "landslide"],
      lat: 19.301,
      lng: 84.822,
    },
    {
      id: "res-rescue-ndrf",
      name: "NDRF Rapid Rescue Team Bravo",
      type: "rescue_team",
      capacity_total: 24,
      capacity_used: 0,
      status: "available",
      disaster_types: ["flood", "cyclone", "landslide", "fire", "earthquake"],
      lat: 19.317,
      lng: 84.798,
    },
    {
      id: "res-fuel-depot",
      name: "Emergency Operations Field Response Unit",
      type: "rescue_team",
      capacity_total: 40,
      capacity_used: 8,
      status: "available",
      disaster_types: ["flood", "cyclone", "fire"],
      lat: 19.305,
      lng: 84.78,
    },
    {
      id: "res-gear-vests",
      name: "Civil Defense Life Jackets & Inflatable Boats Hub",
      type: "boat",
      capacity_total: 60,
      capacity_used: 12,
      status: "available",
      disaster_types: ["flood", "cyclone", "tsunami"],
      lat: 19.308,
      lng: 84.788,
    },
    {
      id: "res-med-depot",
      name: "District Hospital Mobile Medical Van",
      type: "medical_van",
      capacity_total: 30,
      capacity_used: 4,
      status: "available",
      disaster_types: ["medical", "flood", "cyclone", "fire", "landslide"],
      lat: 19.325,
      lng: 84.802,
    },
    {
      id: "res-ambulance-101",
      name: "108 Rapid Ambulance AMB-101",
      type: "ambulance",
      capacity_total: 2,
      capacity_used: 0,
      status: "available",
      disaster_types: ["medical", "accident", "fire", "building_collapse"],
      lat: 19.321,
      lng: 84.807,
    },
    {
      id: "res-fire-engine-7",
      name: "Fire & Rescue Tender FE-07",
      type: "fire_engine",
      capacity_total: 6,
      capacity_used: 0,
      status: "available",
      disaster_types: ["fire", "gas_leak", "building_collapse", "accident"],
      lat: 19.312,
      lng: 84.813,
    },
    {
      id: "res-food-central",
      name: "District Central Food & Water Ration Stock",
      type: "food_stock",
      capacity_total: 1000,
      capacity_used: 180,
      status: "available",
      disaster_types: ["flood", "cyclone", "fire", "landslide"],
      lat: 19.318,
      lng: 84.795,
    },
  ];
  return raw.map((r) => ({
    ...r,
    location_wkt: wkt(r.lng, r.lat),
    updated_at: now,
  }));
}

let pool: StoredResource[] = seedPool();
let hydrateAttempted = false;
let hydratePromise: Promise<void> | null = null;

interface RawResourceDoc {
  _id: { toString(): string };
  name: string;
  type: string;
  capacity_total?: number;
  capacity_used?: number;
  status?: string;
  disaster_types?: string[];
  location?: { coordinates?: number[] };
}

function coordsFromDoc(doc: RawResourceDoc): { lat: number; lng: number } {
  const c = doc?.location?.coordinates;
  if (Array.isArray(c) && c.length === 2) {
    return { lat: Number(c[1]), lng: Number(c[0]) };
  }
  return { lat: 0, lng: 0 };
}

/**
 * One-shot upgrade of the pool from MongoDB. Safe to await repeatedly — the
 * network hit only happens once. If Mongo is offline or empty the demo pool
 * stays in place.
 */
export async function ensureResourcesHydrated(): Promise<void> {
  if (hydrateAttempted) return;
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      const { connectToDatabase } = await import("@/lib/mongodb");
      const { ResourceModel } = await import("@/lib/models/Resource");
      await connectToDatabase();
      const docs = (await ResourceModel.find().lean()) as unknown as RawResourceDoc[];
      if (Array.isArray(docs) && docs.length > 0) {
        pool = docs.map((d) => {
          const { lat, lng } = coordsFromDoc(d);
          return {
            id: d._id.toString(),
            mongo_id: d._id.toString(),
            name: d.name,
            type: d.type,
            capacity_total: d.capacity_total ?? 0,
            capacity_used: d.capacity_used ?? 0,
            status: d.status ?? "available",
            disaster_types: d.disaster_types ?? [],
            lat,
            lng,
            location_wkt: wkt(lng, lat),
            updated_at: new Date().toISOString(),
          };
        });
      }
    } catch (err) {
      console.warn("[resourceStore] Mongo hydrate skipped:", (err as Error).message);
    } finally {
      hydrateAttempted = true;
    }
  })();

  return hydratePromise;
}

/** Current pool without waiting on hydration (kicks hydration off in the bg). */
export function snapshotResources(): StoredResource[] {
  if (!hydrateAttempted) void ensureResourcesHydrated();
  return pool.map((r) => ({ ...r }));
}

export function getResource(id: string): StoredResource | null {
  return pool.find((r) => r.id === id) || null;
}

function writeThrough(r: StoredResource, patch: Record<string, unknown>): void {
  if (!r.mongo_id) return;
  void (async () => {
    try {
      const { ResourceModel } = await import("@/lib/models/Resource");
      await ResourceModel.updateOne({ _id: r.mongo_id }, { $set: patch });
    } catch {
      /* best effort */
    }
  })();
}

/**
 * Commit `amount` units of a resource to an incident. Bumps capacity_used
 * (clamped to the total) and flips an idle unit to `en_route`. Returns the
 * updated row, or null if the id is unknown.
 */
export function allocateCapacity(
  id: string,
  amount: number
): StoredResource | null {
  const r = pool.find((x) => x.id === id);
  if (!r) return null;
  const add = Math.max(0, Math.round(amount));
  r.capacity_used = Math.min(r.capacity_total, r.capacity_used + add);
  if (r.status === "available") r.status = "en_route";
  r.updated_at = new Date().toISOString();
  writeThrough(r, { capacity_used: r.capacity_used, status: r.status });
  return { ...r };
}

/** Give capacity back (incident resolved / allocation superseded). */
export function releaseCapacity(
  id: string,
  amount: number,
  { freeIfIdle = true }: { freeIfIdle?: boolean } = {}
): StoredResource | null {
  const r = pool.find((x) => x.id === id);
  if (!r) return null;
  const sub = Math.max(0, Math.round(amount));
  r.capacity_used = Math.max(0, r.capacity_used - sub);
  if (freeIfIdle && headroomOf(r) > 0 && r.status === "en_route") {
    r.status = "available";
  }
  r.updated_at = new Date().toISOString();
  writeThrough(r, { capacity_used: r.capacity_used, status: r.status });
  return { ...r };
}

export function setResourceStatus(
  id: string,
  status: ResourceStatus
): StoredResource | null {
  const r = pool.find((x) => x.id === id);
  if (!r) return null;
  r.status = status;
  r.updated_at = new Date().toISOString();
  writeThrough(r, { status });
  return { ...r };
}

/** Test hook. */
export function _resetResourceStore(): void {
  pool = seedPool();
  hydrateAttempted = false;
  hydratePromise = null;
}
