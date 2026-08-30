"use client";

import { useCallback, useEffect, useState } from "react";
import i18n from "./i18n";

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

/** Synchronizes i18next package and DOM translation cookie */
function syncEngineLanguage(name: LanguageName) {
  const code = nameToCode(name);
  if (i18n.language !== code) {
    i18n.changeLanguage(code);
  }

  if (typeof window !== "undefined") {
    const langTarget = code === "or" ? "or" : code;
    // Set cookie for browser translation element
    document.cookie = `googtrans=/en/${langTarget}; path=/; domain=${window.location.hostname}`;
    document.cookie = `googtrans=/en/${langTarget}; path=/`;

    // Dispatch DOM event for translation triggers
    window.dispatchEvent(new CustomEvent("i18n:language-changed", { detail: { name, code } }));
  }
}

export function setStoredLanguage(value: string) {
  const name = normalizeToName(value) ?? DEFAULT_NAME;
  try {
    window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    /* storage fallback */
  }
  syncEngineLanguage(name);
  window.dispatchEvent(new CustomEvent<LanguageName>(CHANGE_EVENT, { detail: name }));
}

export interface UseLanguage {
  name: LanguageName;
  code: LanguageCode;
  language: (typeof LANGUAGES)[number];
  setLanguage: (value: string) => void;
  t: (key: string, fallback?: string) => string;
}

export function useLanguage(): UseLanguage {
  const [name, setName] = useState<LanguageName>(DEFAULT_NAME);

  useEffect(() => {
    const currentName = getStoredLanguageName();
    setName(currentName);
    syncEngineLanguage(currentName);

    const sync = () => {
      const updated = getStoredLanguageName();
      setName(updated);
      syncEngineLanguage(updated);
    };

    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<LanguageName>).detail;
      const updated = detail ?? getStoredLanguageName();
      setName(updated);
      syncEngineLanguage(updated);
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

  const t = useCallback(
    (key: string, fallback?: string) => {
      return i18n.t(key, { defaultValue: fallback || key });
    },
    [name]
  );

  return {
    name,
    code: nameToCode(name),
    language: LANGUAGES.find((l) => l.name === name) ?? LANGUAGES[0],
    setLanguage,
    t,
  };
}
