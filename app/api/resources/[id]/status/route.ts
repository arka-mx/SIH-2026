import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAuthority } from "@/lib/auth";
import {
  ensureResourcesHydrated,
  getResource,
  setResourceStatus,
} from "@/lib/resourceStore";

const VALID = ["available", "en_route", "at_scene"] as const;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAuthorizedAuthority(req)) {
      return NextResponse.json(
        { error: "Unauthorized authority token" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = String(body.status || "");
    if (!VALID.includes(status as (typeof VALID)[number])) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    await ensureResourcesHydrated();
    if (!getResource(id)) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const updated = setResourceStatus(id, status as (typeof VALID)[number])!;
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      type: updated.type,
      capacity_total: updated.capacity_total,
      capacity_used: updated.capacity_used,
      status: updated.status,
      disaster_types: updated.disaster_types,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to update resource status" },
      { status: 500 }
    );
  }
}
