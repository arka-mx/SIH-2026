"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { LANGUAGES, useLanguage } from "@/lib/language";

type Variant = "hero" | "inline" | "compact";

interface Props {
  /** Visible field label. Shown inline for `hero`, above for `inline`, hidden for `compact`. */
  label?: string;
  variant?: Variant;
  className?: string;
}

/**
 * Accessible custom language dropdown. Replaces the native <select> so the
 * open list can be styled to match the design system. Writes through
 * `useLanguage()`, so a change here updates every screen at once.
 */
export function LanguageSelect({ label, variant = "hero", className }: Props) {
  const { name, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const listboxId = useId();
  const selectedIndex = Math.max(0, LANGUAGES.findIndex((l) => l.name === name));
  const current = LANGUAGES[selectedIndex];

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Move focus into the list when it opens; back to the trigger when it closes.
  useEffect(() => {
    if (open) {
      setActiveIndex(selectedIndex);
      listRef.current?.focus();
    }
  }, [open, selectedIndex]);

  function choose(index: number) {
    const lang = LANGUAGES[index];
    if (lang) setLanguage(lang.name);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % LANGUAGES.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + LANGUAGES.length) % LANGUAGES.length);
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(LANGUAGES.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div
      ref={rootRef}
      className={`lang-select${className ? ` ${className}` : ""}`}
      data-variant={variant}
      data-open={open}
    >
      {label && variant === "inline" && (
        <span className="lang-select__field-label">{label}</span>
      )}

      <button
        ref={triggerRef}
        type="button"
        className="lang-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label ? `${label}: ${current.name}` : `Language: ${current.name}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
      >
        <Languages size={16} className="lang-select__icon" aria-hidden />
        {label && variant === "hero" && (
          <span className="lang-select__label">{label}</span>
        )}
        <span className="lang-select__value">{current.native}</span>
        <ChevronDown size={15} className="lang-select__chevron" aria-hidden />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label={label || "Language"}
          aria-activedescendant={`${listboxId}-opt-${activeIndex}`}
          className="lang-select__list"
          onKeyDown={onListKeyDown}
        >
          {LANGUAGES.map((lang, i) => (
            <li
              key={lang.code}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              data-active={i === activeIndex}
              className="lang-select__option"
              onClick={() => choose(i)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="lang-select__option-native">{lang.native}</span>
              <span className="lang-select__option-name">{lang.name}</span>
              {i === selectedIndex && (
                <Check size={15} className="lang-select__check" aria-hidden />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
