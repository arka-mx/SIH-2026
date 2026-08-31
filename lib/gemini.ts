/**
 * Minimal Google Gemini client
 * ============================
 * One tiny REST wrapper over the Generative Language API — no SDK, no extra
 * dependency, works from Next route handlers on the server only.
 *
 * Every helper is best-effort: if `GEMINI_API_KEY` is unset, the model is
 * unreachable, or it returns something we can't parse, the caller gets `null`
 * and the surrounding feature carries on with its deterministic behaviour.
 * AI here only *augments* — it is never on the critical path of an SOS.
 *
 * Env:
 *   GEMINI_API_KEY   – required to enable any AI feature (server-side only)
 *   GEMINI_MODEL     – optional, defaults to "gemini-2.0-flash"
 */

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_TIMEOUT_MS = 12_000;

export function geminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export interface GeminiImagePart {
  /** raw base64 (no data: prefix) */
  data: string;
  mimeType: string;
}

interface GeminiCallOptions {
  /** System-style framing prepended to the user prompt. */
  instruction?: string;
  /** Optional inline images (photos attached to a report, etc.). */
  images?: GeminiImagePart[];
  /** Ask the model to return strict JSON; the raw text is still returned too. */
  json?: boolean;
  temperature?: number;
  timeoutMs?: number;
}

/**
 * Low-level single-turn generation. Returns the model's plain-text output, or
 * `null` on any failure. Never throws.
 */
export async function geminiGenerateText(
  prompt: string,
  opts: GeminiCallOptions = {}
): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const parts: Record<string, unknown>[] = [{ text: prompt }];
  for (const img of opts.images ?? []) {
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.instruction) {
    body.systemInstruction = { parts: [{ text: opts.instruction }] };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}/${geminiModel()}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[gemini] ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("")
        .trim();
    return text || null;
  } catch (err) {
    console.warn("[gemini] request failed:", (err as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generation that expects a JSON object back. Tolerates the model wrapping the
 * object in ```json fences or prose. Returns the parsed object typed as `T`, or
 * `null`.
 */
export async function geminiGenerateJson<T = unknown>(
  prompt: string,
  opts: GeminiCallOptions = {}
): Promise<T | null> {
  const raw = await geminiGenerateText(prompt, { ...opts, json: true });
  if (!raw) return null;
  return parseJsonLoose<T>(raw);
}

export function parseJsonLoose<T = unknown>(raw: string): T | null {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Grab the outermost {...} if the model added chatter around it.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}
