"use client";

/**
 * Runtime machine-translation helper used by <AutoTranslateProvider>.
 *
 * Given a batch of English source strings and a target ISO code it returns a
 * `Map<source, translated>`. Results are cached in localStorage per language so
 * repeat visits and re-renders don't re-hit the network.
 *
 * Uses the public Google translate endpoint (no key). This is a prototype-grade
 * dependency: if a request fails we silently fall back to the source text.
 */

const CACHE_PREFIX = "momentum_tr_cache_";
const MAX_CACHE_ENTRIES = 2000;
const CHUNK_LINES = 40;

type CacheMap = Record<string, string>;

function cacheKey(code: string) {
  return `${CACHE_PREFIX}${code}`;
}

function readCache(code: string): CacheMap {
  try {
    return JSON.parse(window.localStorage.getItem(cacheKey(code)) || "{}") as CacheMap;
  } catch {
    return {};
  }
}

function writeCache(code: string, map: CacheMap) {
  try {
    let entries = Object.entries(map);
    if (entries.length > MAX_CACHE_ENTRIES) {
      entries = entries.slice(entries.length - MAX_CACHE_ENTRIES);
    }
    window.localStorage.setItem(cacheKey(code), JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* quota / unavailable — keep going with in-memory only */
  }
}

async function translateChunk(lines: string[], code: string): Promise<string[]> {
  const q = encodeURIComponent(lines.join("\n"));
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${code}&dt=t&q=${q}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`translate ${res.status}`);
  const data = await res.json();
  // data[0] is an array of [translatedSegment, sourceSegment, ...] tuples.
  const joined: string = (data[0] as unknown[])
    .map((seg) => (Array.isArray(seg) ? (seg[0] as string) : ""))
    .join("");
  const out = joined.split("\n");
  // Defensive: keep alignment with the input if the service merged/split lines.
  if (out.length !== lines.length) return lines;
  return out;
}

/**
 * Translate `sources` into `code`. English / unknown codes return an identity map.
 */
export async function translateBatch(
  sources: string[],
  code: string
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = Array.from(new Set(sources.map((s) => s.trim()).filter(Boolean)));
  if (!code || code === "en" || unique.length === 0) {
    unique.forEach((s) => result.set(s, s));
    return result;
  }

  const cache = readCache(code);
  const missing: string[] = [];
  for (const s of unique) {
    if (cache[s] != null) result.set(s, cache[s]);
    else missing.push(s);
  }

  for (let i = 0; i < missing.length; i += CHUNK_LINES) {
    const chunk = missing.slice(i, i + CHUNK_LINES);
    try {
      const translated = await translateChunk(chunk, code);
      chunk.forEach((src, idx) => {
        const val = translated[idx] ?? src;
        cache[src] = val;
        result.set(src, val);
      });
    } catch {
      chunk.forEach((src) => result.set(src, src));
    }
  }

  writeCache(code, cache);
  return result;
}
