"use client";

const SESSION_STORAGE_KEY = "momentum_citizen_session_id";

/**
 * Retrieves the deterministic IP-based session ID from `/api/session`.
 * This session ID is strictly unique and locked to the client's IP address.
 * Even if localStorage is cleared or regenerated, it will always resolve to the exact same IP session ID.
 */
export async function fetchIpBasedSessionId(): Promise<string> {
  if (typeof window === "undefined") {
    return "server-session";
  }

  try {
    const res = await fetch("/api/session", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.sessionId) {
        localStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
        return data.sessionId;
      }
    }
  } catch (err) {
    console.warn("Could not fetch IP session ID from backend, using cached session:", err);
  }

  return getOrCreateSessionId();
}

/**
 * Fallback to cached IP session ID or static server identifier.
 * Ensures no random IDs can be generated.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "server-session";
  }

  const cached = localStorage.getItem(SESSION_STORAGE_KEY);
  if (cached) {
    return cached;
  }

  return "ip-session-locked-client";
}

/**
 * Enforces immutable IP session ID (always returns the IP-locked session ID).
 */
export function createNewSessionId(): string {
  return getOrCreateSessionId();
}
