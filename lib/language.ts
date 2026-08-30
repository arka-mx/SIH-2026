"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Single source of truth for the app's language preference.
 *
 * The chosen language is persisted in localStorage under `momentum_language`
 * as the canonical English NAME ("English", "Hindi", …). Legacy ISO codes
 * ("en", "hi", …) are still accepted on read for backwards compatibility.
 *
 * Any component can call `useLanguage()` to read the current value and stay in
 * sync — changes made on one screen propagate live to every mounted consumer
 * (same tab, via a custom event) and across tabs (via the `storage` event).
 */

export const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export type LanguageName = (typeof LANGUAGES)[number]["name"];

export const STORAGE_KEY = "momentum_language";
const CHANGE_EVENT = "momentum:language-change";
const DEFAULT_NAME: LanguageName = "English";

const NAME_BY_CODE = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l.name])
) as Record<LanguageCode, LanguageName>;

const CODE_BY_NAME = Object.fromEntries(
  LANGUAGES.map((l) => [l.name, l.code])
) as Record<LanguageName, LanguageCode>;

/** Accepts a name ("Hindi") or a legacy code ("hi") and returns the canonical name. */
export function normalizeToName(value: string | null | undefined): LanguageName | null {
  if (!value) return null;
  if (value in CODE_BY_NAME) return value as LanguageName;
  if (value in NAME_BY_CODE) return NAME_BY_CODE[value as LanguageCode];
  return null;
}

export function nameToCode(name: LanguageName): LanguageCode {
  return CODE_BY_NAME[name] ?? "en";
}

export function getStoredLanguageName(): LanguageName {
  if (typeof window === "undefined") return DEFAULT_NAME;
  try {
    return normalizeToName(window.localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_NAME;
  } catch {
    return DEFAULT_NAME;
  }
}

/** Persist the preference and notify every listener in this tab + other tabs. */
export function setStoredLanguage(value: string) {
  const name = normalizeToName(value) ?? DEFAULT_NAME;
  try {
    window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    /* storage unavailable — still fire the event so the live UI updates */
  }
  window.dispatchEvent(new CustomEvent<LanguageName>(CHANGE_EVENT, { detail: name }));
}

export interface UseLanguage {
  /** Canonical English name, e.g. "Hindi". */
  name: LanguageName;
  /** ISO code, e.g. "hi". */
  code: LanguageCode;
  /** One of the LANGUAGES entries. */
  language: (typeof LANGUAGES)[number];
  /** Update the preference everywhere. Accepts a name or a code. */
  setLanguage: (value: string) => void;
}

export function useLanguage(): UseLanguage {
  const [name, setName] = useState<LanguageName>(DEFAULT_NAME);

  useEffect(() => {
    setName(getStoredLanguageName());

    const sync = () => setName(getStoredLanguageName());
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<LanguageName>).detail;
      setName(detail ?? getStoredLanguageName());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };

    window.addEventListener(CHANGE_EVENT, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setLanguage = useCallback((value: string) => setStoredLanguage(value), []);

  return {
    name,
    code: nameToCode(name),
    language: LANGUAGES.find((l) => l.name === name) ?? LANGUAGES[0],
    setLanguage,
  };
}
