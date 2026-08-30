import { NextResponse } from "next/server";
import { getActiveAllocations } from "@/lib/allocationStore";

/**
 * GET /api/allocations
 *
 * The active allocation ledger — one line per incident, either a `recommended`
 * auto-match or a confirmed `en_route` / `at_scene` dispatch. The admin map uses
 * it to draw the resource→incident connectors and keep them on screen.
 */
export async function GET() {
  return NextResponse.json(getActiveAllocations());
}
