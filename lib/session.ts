"use client";

const SESSION_STORAGE_KEY = "sih_citizen_session_id";

/**
 * Retrieves an existing anonymous session ID from localStorage or creates a new UUID.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "server-session";
  }

  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = "session-" + Math.random().toString(36).substring(2, 10) + "-" + Date.now().toString(36);
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Resets the session ID (e.g. for simulating a new citizen reporter on the same machine during demo)
 */
export function createNewSessionId(): string {
  if (typeof window === "undefined") {
    return "server-session";
  }
  const sessionId = "session-" + Math.random().toString(36).substring(2, 10) + "-" + Date.now().toString(36);
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}
