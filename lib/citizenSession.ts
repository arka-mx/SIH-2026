"use client";

import type { ReportItem } from "@/lib/api";

/**
 * Durable, client-side citizen session.
 *
 * The citizen panel is zero-login: identity is a name the person types once and
 * an active emergency report tied to their device. Neither survives a browser
 * refresh on its own — the name was never stored and the active report lives in
 * a best-effort in-memory server store (Mongo is usually offline in dev). For a
 * dispatch tool, losing "help is on the way" on a refresh is unacceptable, so we
 * mirror both to localStorage (with a cookie + in-memory fallback, like
 * lib/device.ts) and hydrate from there instantly on load.
 */

const PROFILE_KEY = "momentum_citizen_profile";
const ACTIVE_REPORT_KEY = "momentum_citizen_active_report";
const PROFILE_COOKIE = "momentum_citizen_name";

export interface CitizenProfile {
  name: string;
  savedAt: string;
}

let profileCache: CitizenProfile | null = null;
let activeReportCache: ReportItem | null = null;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  const d = new Date();
  d.setTime(d.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
}

// ── Citizen profile (name) ──────────────────────────────────────────────

export function getCitizenProfile(): CitizenProfile | null {
  if (profileCache) return profileCache;
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CitizenProfile;
      if (parsed && typeof parsed.name === "string" && parsed.name.trim().length > 0) {
        profileCache = parsed;
        return parsed;
      }
    }
  } catch {
    // fall through to cookie
  }

  const cookieName = readCookie(PROFILE_COOKIE);
  if (cookieName && cookieName.trim().length > 0) {
    profileCache = { name: decodeURIComponent(cookieName).trim(), savedAt: new Date().toISOString() };
    return profileCache;
  }

  return null;
}

export function saveCitizenProfile(name: string): CitizenProfile {
  const clean = name.trim();
  const profile: CitizenProfile = { name: clean, savedAt: new Date().toISOString() };
  profileCache = profile;

  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage restrictions
  }
  writeCookie(PROFILE_COOKIE, clean);
  return profile;
}

export function clearCitizenProfile(): void {
  profileCache = null;
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // ignore
  }
  deleteCookie(PROFILE_COOKIE);
}

// ── Active report snapshot ──────────────────────────────────────────────

export function getCachedActiveReport(): ReportItem | null {
  if (activeReportCache) return activeReportCache;
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(ACTIVE_REPORT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ReportItem;
      if (parsed && parsed.id) {
        activeReportCache = parsed;
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function cacheActiveReport(report: ReportItem | null): void {
  const terminal =
    !report || report.status === "resolved" || report.status === "cancelled";

  if (terminal) {
    activeReportCache = null;
    try {
      localStorage.removeItem(ACTIVE_REPORT_KEY);
    } catch {
      // ignore
    }
    return;
  }

  activeReportCache = report;
  try {
    localStorage.setItem(ACTIVE_REPORT_KEY, JSON.stringify(report));
  } catch {
    // ignore
  }
}
