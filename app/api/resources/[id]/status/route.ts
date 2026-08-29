import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuthority } from "@/lib/auth";
import Resource, { RESOURCE_STATUSES } from "@/lib/models/Resource";

const VALID_STATUSES = ["en_route", "at_scene", "available"] as const;

const VALID_TRANSITIONS: Record<string, string[]> = {
  available: ["en_route"],
  en_route: ["at_scene"],
  at_scene: ["available"],
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAuthority(req);
  if (unauthorized) return unauthorized;

  await connectToDatabase();
  const { id } = await params;
  const { status } = await req.json();

  if (!status) {
    return NextResponse.json({ error: "Missing required field: status" }, { status: 400 });
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const resource = await Resource.findById(id);
  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const allowedNext = VALID_TRANSITIONS[resource.status] || [];
  if (!allowedNext.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status transition: ${resource.status} → ${status}` },
      { status: 400 }
    );
  }

  resource.status = status as (typeof RESOURCE_STATUSES)[number];
  await resource.save();

  return NextResponse.json(resource.toJSON());
}
