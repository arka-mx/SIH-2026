"use client";

import { useEffect } from "react";
import { useLanguage } from "@/lib/language";

/**
 * Global Translation Provider mounted at root layout.
 * Ensures that language selection triggers full live DOM translation across
 * all pages (Landing, Citizen, Rescuer, Admin, Login, Resources, etc.).
 */
export function TranslationProvider() {
  const { code } = useLanguage();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const langCode = code === "or" ? "or" : code;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname}`;
    document.cookie = `googtrans=/en/${langCode}; path=/`;

    let container = document.getElementById("google_translate_element");
    if (!container) {
      container = document.createElement("div");
      container.id = "google_translate_element";
      container.style.display = "none";
      document.body.appendChild(container);
    }

    const triggerTranslate = () => {
      const selectEl = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
      if (selectEl) {
        selectEl.value = langCode;
        selectEl.dispatchEvent(new Event("change"));
      }
    };

    if (!(window as any).googleTranslateElementInit) {
      (window as any).googleTranslateElementInit = function () {
        try {
          new (window as any).google.translate.TranslateElement(
            {
              pageLanguage: "en",
              includedLanguages: "en,hi,bn,or,te",
              autoDisplay: false,
            },
            "google_translate_element"
          );
          setTimeout(triggerTranslate, 300);
        } catch {
          /* fallback catch */
        }
      };

      if (!document.getElementById("gt-element-script")) {
        const script = document.createElement("script");
        script.id = "gt-element-script";
        script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        script.async = true;
        document.body.appendChild(script);
      }
    } else {
      triggerTranslate();
    }
  }, [code]);

  return null;
}
