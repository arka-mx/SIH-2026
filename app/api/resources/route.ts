import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Resource from "@/lib/models/Resource";

export async function GET() {
  await connectToDatabase();

  const resources = await Resource.find().sort({ created_at: -1 });
  return NextResponse.json(resources.map((r) => r.toJSON()));
}
