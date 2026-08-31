import { NextResponse } from "next/server";
import { getAllRescueIncidents } from "@/lib/rescueStore";
import { buildSituationBrief } from "@/lib/ai/situationBrief";
import { geminiConfigured } from "@/lib/gemini";

/**
 * GET /api/ai/brief
 * Gemini-generated control-room situational brief over the current active
 * incidents. Returns `{ configured: false }` when no GEMINI_API_KEY is set so
 * the dashboard can hide the widget gracefully.
 */
export async function GET() {
  if (!geminiConfigured()) {
    return NextResponse.json({ configured: false, brief: null });
  }
  try {
    const brief = await buildSituationBrief(getAllRescueIncidents());
    return NextResponse.json({ configured: true, brief });
  } catch (err) {
    console.warn("GET /api/ai/brief failed:", (err as Error)?.message);
    return NextResponse.json({ configured: true, brief: null });
  }
}
