"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/language";
import { translateBatch } from "@/lib/autoTranslate";

/**
 * App-wide runtime translation.
 *
 * Mounted once in the root layout. Whenever the language is not English it walks
 * the visible text of the page (and a few translatable attributes), sends the
 * English source to `translateBatch`, and swaps the rendered strings in place.
 * Originals are kept in a WeakMap so switching back to English restores them
 * exactly. A MutationObserver keeps dynamically rendered / client-fetched
 * content translated too, so this works on every route without per-page wiring.
 */

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "CODE",
  "PRE",
]);
const ATTRS = ["placeholder", "title", "aria-label", "alt"];
// Pure symbols / numbers / punctuation aren't worth a round trip.
const HAS_LETTER = /[A-Za-z]/;

interface Target {
  apply: (value: string) => void;
  source: string;
}

export function AutoTranslateProvider({ children }: { children: React.ReactNode }) {
  const { code } = useLanguage();
  const pathname = usePathname();

  const originalText = useRef<WeakMap<Text, string>>(new WeakMap());
  const originalAttr = useRef<WeakMap<Element, Record<string, string>>>(new WeakMap());
  const applyingRef = useRef(false);
  const codeRef = useRef(code);
  codeRef.current = code;

  useEffect(() => {
    if (typeof window === "undefined") return;

    function collect(): Target[] {
      const targets: Target[] = [];

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const el = node.parentElement;
          if (!el) return NodeFilter.FILTER_REJECT;
          if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
          if (el.closest("[data-no-translate]")) return NodeFilter.FILTER_REJECT;
          const text = node.nodeValue || "";
          if (!text.trim() || !HAS_LETTER.test(text)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      let n = walker.nextNode() as Text | null;
      while (n) {
        const node = n;
        if (!originalText.current.has(node)) {
          originalText.current.set(node, node.nodeValue || "");
        }
        const source = originalText.current.get(node) || "";
        if (source.trim() && HAS_LETTER.test(source)) {
          targets.push({
            source: source.trim(),
            apply: (value) => {
              // Preserve leading / trailing whitespace of the original node.
              const lead = source.match(/^\s*/)?.[0] ?? "";
              const trail = source.match(/\s*$/)?.[0] ?? "";
              node.nodeValue = lead + value + trail;
            },
          });
        }
        n = walker.nextNode() as Text | null;
      }

      const els = document.body.querySelectorAll(
        ATTRS.map((a) => `[${a}]`).join(",")
      );
      els.forEach((el) => {
        if (SKIP_TAGS.has(el.tagName)) return;
        if (el.closest("[data-no-translate]")) return;
        let store = originalAttr.current.get(el);
        if (!store) {
          store = {};
          originalAttr.current.set(el, store);
        }
        for (const attr of ATTRS) {
          if (!el.hasAttribute(attr)) continue;
          if (store[attr] == null) store[attr] = el.getAttribute(attr) || "";
          const source = store[attr];
          if (source.trim() && HAS_LETTER.test(source)) {
            targets.push({
              source: source.trim(),
              apply: (value) => el.setAttribute(attr, value),
            });
          }
        }
      });

      return targets;
    }

    function restore() {
      applyingRef.current = true;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n = walker.nextNode() as Text | null;
      while (n) {
        const orig = originalText.current.get(n);
        if (orig != null && n.nodeValue !== orig) n.nodeValue = orig;
        n = walker.nextNode() as Text | null;
      }
      document.body
        .querySelectorAll(ATTRS.map((a) => `[${a}]`).join(","))
        .forEach((el) => {
          const store = originalAttr.current.get(el);
          if (!store) return;
          for (const attr of ATTRS) {
            if (store[attr] != null) el.setAttribute(attr, store[attr]);
          }
        });
      applyingRef.current = false;
    }

    let cancelled = false;

    async function run() {
      const activeCode = codeRef.current;
      if (!activeCode || activeCode === "en") {
        restore();
        return;
      }
      const targets = collect();
      if (targets.length === 0) return;
      const map = await translateBatch(
        targets.map((t) => t.source),
        activeCode
      );
      if (cancelled || codeRef.current !== activeCode) return;
      applyingRef.current = true;
      for (const t of targets) {
        const translated = map.get(t.source);
        if (translated && translated !== t.source) t.apply(translated);
      }
      applyingRef.current = false;
    }

    // Debounced re-run driven by DOM mutations.
    let timer: number | undefined;
    const schedule = () => {
      if (applyingRef.current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void run();
      }, 250);
    };

    const observer = new MutationObserver((records) => {
      if (applyingRef.current) return;
      const meaningful = records.some(
        (r) => r.type === "childList" || r.type === "characterData" || r.type === "attributes"
      );
      if (meaningful) schedule();
    });

    void run();
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [code, pathname]);

  return <>{children}</>;
}
