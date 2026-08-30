"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Crosshair, MapPin, Pencil, Search, X } from "lucide-react";
import { useAdminLocation } from "@/lib/adminLocation";
import { apiForwardGeocode, apiReverseGeocode, GeocodeResult } from "@/lib/api";

/** Trim Nominatim's long display_name down to the first couple of segments. */
function shortLabel(label: string): string {
  const parts = label.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.slice(0, 2).join(", ") || label;
}

export function AdminLocationControl() {
  const { location, ready, setLocation, clearLocation } = useAdminLocation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | "gps" | "search">(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function reset() {
    setError(null);
    setBusy(null);
    setQuery("");
    setResults([]);
  }

  function toggle() {
    reset();
    setOpen((v) => !v);
  }

  async function useCurrentLocation() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("This device can't share its location.");
      return;
    }
    setBusy("gps");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const label = await apiReverseGeocode(latitude, longitude);
          setLocation({ label, lat: latitude, lng: longitude, source: "gps" });
          setOpen(false);
        } catch {
          setError("Couldn't resolve that location. Try typing it instead.");
        } finally {
          setBusy(null);
        }
      },
      () => {
        setBusy(null);
        setError("Location permission denied. Type a place name instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    setBusy("search");
    try {
      const found = await apiForwardGeocode(query);
      setResults(found);
      if (found.length === 0) setError("No matching place found.");
    } catch {
      setError("Search failed. Check your connection.");
    } finally {
      setBusy(null);
    }
  }

  function pick(r: GeocodeResult) {
    setLocation({ label: r.label, lat: r.lat, lng: r.lng, source: "manual" });
    setOpen(false);
  }

  // Avoid an SSR / first-paint flash before localStorage is read.
  if (!ready) {
    return <strong className="admin-loc__trigger" aria-hidden="true"><MapPin size={15} /> …</strong>;
  }

  return (
    <div className="admin-loc" ref={rootRef}>
      {location ? (
        <button
          type="button"
          className="admin-loc__trigger"
          onClick={toggle}
          title={location.label}
          aria-expanded={open}
        >
          <MapPin size={15} />
          <span className="admin-loc__label">{shortLabel(location.label)}</span>
          <Pencil size={12} className="admin-loc__edit" />
        </button>
      ) : (
        <button
          type="button"
          className="admin-loc__trigger admin-loc__trigger--unset"
          onClick={toggle}
          aria-expanded={open}
        >
          <MapPin size={15} /> Set operating area
        </button>
      )}

      {open && (
        <div className="admin-loc__pop" role="dialog" aria-label="Set operating area">
          <div className="admin-loc__pop-head">
            <span>Operating area</span>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
              <X size={15} />
            </button>
          </div>

          <button
            type="button"
            className="adm-btn admin-loc__cta"
            onClick={useCurrentLocation}
            disabled={busy !== null}
          >
            <Crosshair size={14} />
            {busy === "gps" ? "Locating…" : "Use my current location"}
          </button>

          <div className="admin-loc__or"><span>or</span></div>

          <form className="admin-loc__search" onSubmit={runSearch}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a city or district"
              aria-label="Place name"
            />
            <button type="submit" aria-label="Search" disabled={busy !== null || !query.trim()}>
              <Search size={14} />
            </button>
          </form>

          {results.length > 0 && (
            <ul className="admin-loc__results">
              {results.map((r, i) => (
                <li key={`${r.lat},${r.lng},${i}`}>
                  <button type="button" onClick={() => pick(r)}>
                    <MapPin size={13} />
                    <span>{r.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="admin-loc__error">{error}</p>}

          {location && (
            <div className="admin-loc__footer">
              <span>
                {location.source === "gps" ? "From current location" : "Set manually"}
              </span>
              <button
                type="button"
                onClick={() => {
                  clearLocation();
                  setOpen(false);
                }}
              >
                Clear
              </button>
            </div>
          )}
          {!location && results.length === 0 && !error && (
            <p className="admin-loc__hint">
              <Check size={12} /> Used across the dashboard, map and reports.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
