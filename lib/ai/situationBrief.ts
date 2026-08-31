/**
 * AI Situation Brief (Gemini)
 * ===========================
 * Rolls the current active-incident picture into a short control-room briefing
 * an operator can read in ten seconds: what's escalating, where to look first,
 * and what the data does NOT yet tell us.
 *
 * Deterministic inputs only (incident type, verification tier, report counts,
 * recency, location). The model summarises — it does not invent incidents.
 * Returns `null` when Gemini is unconfigured or the call fails; callers should
 * fall back to the raw incident list.
 */

import { geminiConfigured, geminiGenerateJson } from "@/lib/gemini";
import type { ActiveRescueIncident } from "@/lib/rescueStore";

export interface SituationBrief {
  headline: string;
  bullets: string[];
  priority_incident_ids: string[];
  data_gaps: string[];
  generated_at: string;
  model: string;
  incident_count: number;
}

const INSTRUCTION = `You are the shift supervisor in a disaster-response control room in India.
Write a terse situational brief for the operators coming on duty. Be specific about
locations and trends. Do not invent incidents or numbers beyond the data given.
Reply ONLY with JSON.`;

export async function buildSituationBrief(
  incidents: ActiveRescueIncident[]
): Promise<SituationBrief | null> {
  if (!geminiConfigured()) return null;

  const active = incidents.filter(
    (i) => i.status !== "resolved" && i.status !== "cancelled"
  );
  if (active.length === 0) return null;

  const now = Date.now();
  const rows = active.slice(0, 40).map((i) => ({
    id: i.id,
    type: i.type,
    severity: i.severity,
    status: i.status,
    confidence: i.verification?.tier ?? "unknown",
    reports: i.report_count,
    where: i.address || `${i.latitude?.toFixed(3)}, ${i.longitude?.toFixed(3)}`,
    minutes_ago: Math.round((now - new Date(i.created_at).getTime()) / 60000),
    ai_severity: i.ai_enrichment?.severity,
    ai_summary: i.ai_enrichment?.summary,
  }));

  const prompt = `Active incidents (JSON):
${JSON.stringify(rows, null, 1)}

Return JSON:
{
  "headline": "<= 16 words capturing the overall picture",
  "bullets": ["3 to 5 short lines: escalations, clusters, resource pressure"],
  "priority_incident_ids": ["incident ids to action first, most urgent first"],
  "data_gaps": ["1 to 3 things the data does not yet confirm"]
}`;

  const raw = await geminiGenerateJson<Record<string, unknown>>(prompt, {
    instruction: INSTRUCTION,
    temperature: 0.25,
  });
  if (!raw) return null;

  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];

  return {
    headline: typeof raw.headline === "string" ? raw.headline.trim() : "Situation brief unavailable.",
    bullets: arr(raw.bullets).slice(0, 6),
    priority_incident_ids: arr(raw.priority_incident_ids).slice(0, 10),
    data_gaps: arr(raw.data_gaps).slice(0, 4),
    generated_at: new Date().toISOString(),
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    incident_count: active.length,
  };
}
