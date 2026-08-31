/**
 * AI Report Enrichment (Gemini)
 * =============================
 * When a citizen files an SOS the deterministic Report Verification System
 * scores how *trustworthy* it is. It does nothing with the *content* — the
 * free-text description and the attached photo.
 *
 * This module fills that gap. It sends the report text (and photo, if present)
 * to Gemini and gets back a structured read of the situation:
 *
 *   • aiSummary        – one crisp line an operator can scan
 *   • aiSeverity       – critical | high | moderate | low
 *   • aiTypeSuggestion – what the hazard actually looks like (may differ from
 *                        the citizen-picked type)
 *   • aiTypeMatch      – does the photo/description back the reported type?
 *   • aiHazards        – concrete on-scene dangers (gas, live wires, trapped…)
 *   • aiPeopleAtRisk   – rough count if stated/visible, else null
 *   • aiCredibility     – "looks genuine" | "unclear" | "possible hoax/spam"
 *   • aiLanguage       – detected language of the original report
 *
 * Everything is advisory. It never changes the verification score or the
 * dispatch decision — an operator still confirms. If Gemini is not configured
 * or the call fails, `enrichReport` returns `null` and the platform behaves
 * exactly as before.
 */

import { geminiConfigured, geminiGenerateJson, GeminiImagePart } from "@/lib/gemini";
import { readFile } from "fs/promises";
import path from "path";

export type AiSeverity = "critical" | "high" | "moderate" | "low";
export type AiCredibility = "genuine" | "unclear" | "suspicious";

export interface AiReportEnrichment {
  summary: string;
  severity: AiSeverity;
  type_suggestion: string;
  type_match: boolean;
  type_match_note: string;
  hazards: string[];
  people_at_risk: number | null;
  credibility: AiCredibility;
  language: string;
  model: string;
  generated_at: string;
}

export interface EnrichReportInput {
  type: string;
  description?: string;
  address?: string;
  reporter_name?: string;
  latitude?: number;
  longitude?: number;
  /** Public URL of an attached photo, e.g. "/uploads/photo-123.jpg". */
  photo_url?: string;
}

const ALLOWED_TYPES = ["flood", "cyclone", "landslide", "medical", "fire", "other"];
const INSTRUCTION = `You are an emergency-dispatch analyst for a disaster response control room in India.
You triage incoming citizen SOS reports. Be conservative: never invent facts that are
not in the text or image. If the report is too thin to judge something, say so.
Reply ONLY with a JSON object, no prose.`;

const MAX_PHOTO_BYTES = 4_000_000; // keep the Gemini request light

function mimeFromExt(p: string): string {
  const ext = path.extname(p).toLowerCase();
  return ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
}

/**
 * Turn a stored photo URL into an inline image part for Gemini.
 *  • absolute http(s) URL (Cloudinary etc.) → fetched over the network
 *  • `/uploads/...` local path              → read from disk
 */
async function loadPhoto(photoUrl?: string): Promise<GeminiImagePart | null> {
  if (!photoUrl) return null;
  try {
    if (/^https?:\/\//i.test(photoUrl)) {
      const res = await fetch(photoUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > MAX_PHOTO_BYTES) return null;
      const mimeType = res.headers.get("content-type")?.split(";")[0] || mimeFromExt(photoUrl);
      return { data: buf.toString("base64"), mimeType };
    }
    if (photoUrl.startsWith("/uploads/")) {
      const safe = photoUrl.replace(/\.\.+/g, "").replace(/^\/+/, "");
      const filePath = path.join(process.cwd(), "public", safe);
      const buf = await readFile(filePath);
      if (buf.byteLength > MAX_PHOTO_BYTES) return null;
      return { data: buf.toString("base64"), mimeType: mimeFromExt(filePath) };
    }
    return null;
  } catch {
    return null;
  }
}

export async function enrichReport(
  input: EnrichReportInput
): Promise<AiReportEnrichment | null> {
  if (!geminiConfigured()) return null;

  const photo = await loadPhoto(input.photo_url);

  const prompt = `A citizen has filed an emergency report.

Reported hazard type: ${input.type || "unspecified"}
Location: ${input.address || "unknown"}${
    input.latitude != null && input.longitude != null
      ? ` (${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)})`
      : ""
  }
Reporter: ${input.reporter_name?.trim() || "anonymous"}
Description (verbatim, may be in any Indian language): """${(input.description || "").slice(0, 1500)}"""
${photo ? "A photo is attached — use it to corroborate or contradict the text." : "No photo attached."}

Return JSON with exactly these keys:
{
  "summary": "<= 22 words, plain English, what is happening and what is needed",
  "severity": "critical | high | moderate | low",
  "type_suggestion": "one of: ${ALLOWED_TYPES.join(", ")} — what the hazard actually appears to be",
  "type_match": true | false,
  "type_match_note": "<= 15 words on why it matches or not",
  "hazards": ["short concrete on-scene dangers, [] if none stated"],
  "people_at_risk": <integer if stated or clearly visible, else null>,
  "credibility": "genuine | unclear | suspicious",
  "language": "detected language of the description, e.g. English, Hindi, Bengali",
  "confidence_note": "<= 15 words on how much to trust this read"
}`;

  const raw = await geminiGenerateJson<Record<string, unknown>>(prompt, {
    instruction: INSTRUCTION,
    images: photo ? [photo] : undefined,
    temperature: 0.15,
  });
  if (!raw) return null;

  return normalize(raw, input.type);
}

function normalize(
  raw: Record<string, unknown>,
  reportedType: string
): AiReportEnrichment {
  const severity = String(raw.severity || "").toLowerCase();
  const credibility = String(raw.credibility || "").toLowerCase();
  const typeSuggestionRaw = String(raw.type_suggestion || reportedType || "other").toLowerCase();

  return {
    summary: str(raw.summary) || "No summary produced.",
    severity: (["critical", "high", "moderate", "low"].includes(severity)
      ? severity
      : "moderate") as AiSeverity,
    type_suggestion: ALLOWED_TYPES.includes(typeSuggestionRaw) ? typeSuggestionRaw : "other",
    type_match: raw.type_match !== false,
    type_match_note: str(raw.type_match_note),
    hazards: Array.isArray(raw.hazards)
      ? raw.hazards.map((h) => str(h)).filter(Boolean).slice(0, 6)
      : [],
    people_at_risk:
      typeof raw.people_at_risk === "number" && Number.isFinite(raw.people_at_risk)
        ? Math.max(0, Math.round(raw.people_at_risk))
        : null,
    credibility: (["genuine", "unclear", "suspicious"].includes(credibility)
      ? credibility
      : "unclear") as AiCredibility,
    language: str(raw.language) || "Unknown",
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    generated_at: new Date().toISOString(),
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
