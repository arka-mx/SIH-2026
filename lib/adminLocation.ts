"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Single source of truth for the admin's operating area (the district / city
 * the Command Center is responsible for).
 *
 * It is NOT hardcoded — the admin sets it once (from the browser's current
 * location or by typing a place name) and it is persisted in localStorage
 * under `momentum_admin_location` as JSON.
 *
 * Any component can call `useAdminLocation()` to read the current value and
 * stay in sync — changes made on one screen propagate live to every mounted
 * consumer (same tab, via a custom event) and across tabs (via `storage`).
 *
 * localStorage is the right home here: the admin identity is a single
 * env-configured account with no per-user server record, the value is a small
 * device-level preference, and the rest of the app already persists session +
 * language the same way. If a real admin-accounts backend is added later,
 * swap the two `read`/`persist` helpers for an API call — the hook API stays.
 */

export interface AdminLocation {
  /** Human-readable label shown in the UI, e.g. "Brahmapur, Odisha". */
  label: string;
  /** Coordinates, when known (always set for "gps", usually for "manual"). */
  lat: number | null;
  lng: number | null;
  /** How the value was captured. */
  source: "gps" | "manual";
  /** ISO timestamp of when it was last set. */
  setAt: string;
}

export const STORAGE_KEY = "momentum_admin_location";
const CHANGE_EVENT = "momentum:admin-location-change";

function isValid(value: unknown): value is AdminLocation {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.label === "string" && v.label.trim().length > 0;
}

export function getStoredAdminLocation(): AdminLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Persist the value (or clear it with `null`) and notify every listener. */
export function setStoredAdminLocation(value: AdminLocation | null) {
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — still fire the event so the live UI updates */
  }
  window.dispatchEvent(
    new CustomEvent<AdminLocation | null>(CHANGE_EVENT, { detail: value ?? null })
  );
}

export interface UseAdminLocation {
  /** The current location, or `null` if the admin hasn't set one yet. */
  location: AdminLocation | null;
  /** `false` until the first read from storage completes (avoids an SSR flash). */
  ready: boolean;
  /** Set the operating area. Pass the label plus optional coordinates/source. */
  setLocation: (input: {
    label: string;
    lat?: number | null;
    lng?: number | null;
    source: AdminLocation["source"];
  }) => void;
  /** Forget the stored location. */
  clearLocation: () => void;
}

export function useAdminLocation(): UseAdminLocation {
  const [location, setLocation] = useState<AdminLocation | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocation(getStoredAdminLocation());
    setReady(true);

    const onCustom = (e: Event) => {
      setLocation((e as CustomEvent<AdminLocation | null>).detail ?? null);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLocation(getStoredAdminLocation());
    };

    window.addEventListener(CHANGE_EVENT, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const set = useCallback<UseAdminLocation["setLocation"]>((input) => {
    setStoredAdminLocation({
      label: input.label.trim(),
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      source: input.source,
      setAt: new Date().toISOString(),
    });
  }, []);

  const clearLocation = useCallback(() => setStoredAdminLocation(null), []);

  return { location, ready, setLocation: set, clearLocation };
}
