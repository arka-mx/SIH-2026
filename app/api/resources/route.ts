import { NextResponse } from "next/server";
import { ensureResourcesHydrated, snapshotResources } from "@/lib/resourceStore";

/**
 * GET /api/resources
 *
 * The live resource pool (shelters, rescue teams, medical units, boats, relief
 * stock) with location, capacity and status. Served from the in-memory pool,
 * which hydrates from MongoDB when one is reachable and reflects every
 * allocation made through /api/allocations/confirm.
 */
export async function GET() {
  await ensureResourcesHydrated();
  const resources = snapshotResources().map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    capacity_total: r.capacity_total,
    capacity_used: r.capacity_used,
    status: r.status,
    disaster_types: r.disaster_types,
    lat: r.lat,
    lng: r.lng,
    location_wkt: r.location_wkt,
  }));
  return NextResponse.json(resources);
}
