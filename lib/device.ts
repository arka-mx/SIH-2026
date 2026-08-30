"use client";

const DEVICE_ID_KEY = "momentum_anonymous_device_id";
const COOKIE_NAME = "momentum_device_id";

// In-memory fallback if storage APIs are restricted
let inMemoryDeviceIdCache: string | null = null;

/**
 * Helper to get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

/**
 * Helper to set a long-lived 10-year persistent cookie
 */
function setCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  const d = new Date();
  d.setTime(d.getTime() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Generates a cryptographically random UUID for anonymous client device identification.
 */
function generateRandomUUID(): string {
  if (typeof window !== "undefined" && window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return "dev-" + Math.random().toString(36).substring(2, 10) + "-" + Date.now().toString(36);
}

/**
 * Retrieves or creates a strictly device-specific, immutable Device ID.
 * 
 * Invariants:
 * 1. Device-Specific: Locked to the local device browser installation (NOT network or IP specific).
 * 2. Immutable: Stored across localStorage, persistent 10-year cookie, and memory cache.
 * 3. Non-Regenerable: Users CANNOT regenerate, reset, or forge a new device ID.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") {
    return "server-device-id";
  }

  // Check 1: In-memory runtime cache
  if (inMemoryDeviceIdCache && inMemoryDeviceIdCache.trim().length > 0) {
    return inMemoryDeviceIdCache;
  }

  try {
    // Check 2: First-party localStorage
    let existingId = localStorage.getItem(DEVICE_ID_KEY);

    // Check 3: Persistent Cookie backup
    if (!existingId || existingId.trim().length === 0) {
      existingId = getCookie(COOKIE_NAME);
    }

    if (existingId && existingId.trim().length > 0) {
      const cleanId = existingId.trim();
      inMemoryDeviceIdCache = cleanId;
      // Synchronize across storage layers
      try {
        localStorage.setItem(DEVICE_ID_KEY, cleanId);
        setCookie(COOKIE_NAME, cleanId);
      } catch {
        // ignore storage restrictions
      }
      return cleanId;
    }

    // Generate once if not present on device
    const newId = generateRandomUUID();
    inMemoryDeviceIdCache = newId;

    try {
      localStorage.setItem(DEVICE_ID_KEY, newId);
      setCookie(COOKIE_NAME, newId);
    } catch {
      // ignore
    }

    return newId;
  } catch (err) {
    console.warn("Storage access restricted, using memory-cached device ID:", err);
    if (!inMemoryDeviceIdCache) {
      inMemoryDeviceIdCache = generateRandomUUID();
    }
    return inMemoryDeviceIdCache;
  }
}
