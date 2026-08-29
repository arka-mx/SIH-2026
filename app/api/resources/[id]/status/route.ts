import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ResourceModel } from "@/lib/models/Resource";
import { isAuthorizedAuthority } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAuthorizedAuthority(req)) {
      return NextResponse.json({ error: "Unauthorized authority token" }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !["available", "en_route", "at_scene"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const updatedResource = await ResourceModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedResource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: updatedResource._id.toString(),
      name: updatedResource.name,
      type: updatedResource.type,
      capacity_total: updatedResource.capacity_total,
      capacity_used: updatedResource.capacity_used,
      status: updatedResource.status,
      disaster_types: updatedResource.disaster_types,
      created_at: updatedResource.created_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update resource status" }, { status: 500 });
  }
}
