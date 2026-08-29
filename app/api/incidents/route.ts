import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Report from "@/lib/models/Report";

export async function GET() {
  await connectToDatabase();

  const reports = await Report.find().sort({ created_at: -1 });
  return NextResponse.json(reports.map((r) => r.toJSON()));
}
