"use client";

import { useEffect, useRef, useState } from "react";
import { AllocationRecommendation } from "@/lib/allocationOptimizer";

interface AllocationOptimizerMapProps {
  recommendations: AllocationRecommendation[];
  base: { lat: number; lng: number; label?: string } | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const LINE_SOURCE_ID = "alloc-lines-source";
const LINE_LAYER_ID = "alloc-lines-layer";

function toneColor(tone: "red" | "amber" | "blue"): string {
  return tone === "red" ? "#dc2626" : tone === "amber" ? "#d97706" : "#2563eb";
}

function linesFC(recs: AllocationRecommendation[], selectedId?: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: recs.map((r) => ({
      type: "Feature" as const,
      properties: {
        color: toneColor(r.severity.tone),
        width: selectedId === r.id ? 5 : 2.5,
        opacity: !selectedId || selectedId === r.id ? 0.9 : 0.25,
        dash: r.kind === "shelter" ? 1 : 0,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [r.resourceLng, r.resourceLat],
          [r.zoneLng, r.zoneLat],
        ],
      },
    })),
  };
}

export function AllocationOptimizerMap({
  recommendations,
  base,
  selectedId,
  onSelect,
}: AllocationOptimizerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.maplibregl) {
      setIsLoaded(true);
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js";
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || mapRef.current) return;

    const center: [number, number] =
      base && base.lat != null && base.lng != null
        ? [base.lng, base.lat]
        : [78.9629, 22.5937];

    const map = new window.maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center,
      zoom: base ? 11 : 4,
      attributionControl: true,
    });
    map.addControl(new window.maplibregl.NavigationControl(), "top-left");
    map.on("load", () => setReady(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [isLoaded, base]);

  // Allocation lines.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const data = linesFC(recommendations, selectedId);
    if (map.getSource(LINE_SOURCE_ID)) {
      (map.getSource(LINE_SOURCE_ID) as any).setData(data);
    } else {
      map.addSource(LINE_SOURCE_ID, { type: "geojson", data });
      map.addLayer({
        id: LINE_LAYER_ID,
        type: "line",
        source: LINE_SOURCE_ID,
        layout: { "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["get", "width"],
          "line-opacity": ["get", "opacity"],
        },
      });
    }
  }, [recommendations, selectedId, ready]);

  // Markers + framing.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const frame: [number, number][] = [];

    if (base && base.lat != null && base.lng != null) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;border-radius:9999px;background:#1d4ed8;border:3px solid #fff;box-shadow:0 0 0 3px rgba(29,78,216,.35);";
      const marker = new window.maplibregl.Marker({ element: el })
        .setLngLat([base.lng, base.lat])
        .setPopup(
          new window.maplibregl.Popup({ offset: 18 }).setHTML(
            `<div style="font:12px sans-serif;padding:2px 4px;"><b>Command Center</b><br/>${
              base.label || "Operating area"
            }</div>`
          )
        )
        .addTo(map);
      markersRef.current.push(marker);
      frame.push([base.lng, base.lat]);
    }

    // De-dupe zones and resources across recommendations.
    const zoneSeen = new Set<string>();
    const resSeen = new Set<string>();

    recommendations.forEach((r) => {
      frame.push([r.zoneLng, r.zoneLat]);
      frame.push([r.resourceLng, r.resourceLat]);

      if (!zoneSeen.has(r.zoneKey)) {
        zoneSeen.add(r.zoneKey);
        const color = toneColor(r.severity.tone);
        const el = document.createElement("div");
        el.style.cssText =
          "display:flex;align-items:center;justify-content:center;cursor:pointer;";
        el.innerHTML = `<div style="width:20px;height:20px;border-radius:9999px;background:${color};border:2px solid #fff;color:#fff;font:700 10px sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,.3);">${r.priorityRank}</div>`;
        el.addEventListener("click", () => onSelect?.(r.id));
        const marker = new window.maplibregl.Marker({ element: el })
          .setLngLat([r.zoneLng, r.zoneLat])
          .setPopup(
            new window.maplibregl.Popup({ offset: 14 }).setHTML(
              `<div style="font:12px sans-serif;padding:2px 4px;max-width:220px;">
                <b>Priority #${r.priorityRank} · ${r.severity.label}</b><br/>
                <span style="text-transform:capitalize;">${r.zoneTypes.join(", ")}</span> zone<br/>
                ~${r.peopleAffected} people affected${r.injured ? ` · ${r.injured} injured` : ""}<br/>
                <span style="color:#64748b;">${r.zoneLabel}</span>
              </div>`
            )
          )
          .addTo(map);
        markersRef.current.push(marker);
      }

      if (!resSeen.has(r.resourceId)) {
        resSeen.add(r.resourceId);
        const isShelter = r.kind === "shelter";
        const el = document.createElement("div");
        el.style.cssText =
          "display:flex;align-items:center;justify-content:center;cursor:pointer;";
        el.innerHTML = `<div style="width:16px;height:16px;background:${
          isShelter ? "#0f766e" : "#475569"
        };border:2px solid #fff;border-radius:${
          isShelter ? "3px" : "9999px"
        };box-shadow:0 2px 5px rgba(0,0,0,.3);"></div>`;
        el.addEventListener("click", () => onSelect?.(r.id));
        const marker = new window.maplibregl.Marker({ element: el })
          .setLngLat([r.resourceLng, r.resourceLat])
          .setPopup(
            new window.maplibregl.Popup({ offset: 12 }).setHTML(
              `<div style="font:12px sans-serif;padding:2px 4px;max-width:220px;">
                <b>${r.resourceName}</b><br/>
                <span style="text-transform:capitalize;">${r.resourceType.replace(/_/g, " ")}</span><br/>
                Allocating ${r.allocatedAmount} ${r.unit} → zone #${r.priorityRank}<br/>
                <span style="color:#64748b;">${r.remainingCapacityAfter} ${r.unit} left after</span>
              </div>`
            )
          )
          .addTo(map);
        markersRef.current.push(marker);
      }
    });

    if (frame.length > 1) {
      const lats = frame.map((f) => f[1]);
      const lngs = frame.map((f) => f[0]);
      try {
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 70, maxZoom: 13, duration: 800 }
        );
      } catch {
        /* ignore */
      }
    }
  }, [recommendations, base, ready, onSelect]);

  // Pan to selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedId) return;
    const r = recommendations.find((x) => x.id === selectedId);
    if (r) {
      map.fitBounds(
        [
          [
            Math.min(r.resourceLng, r.zoneLng),
            Math.min(r.resourceLat, r.zoneLat),
          ],
          [
            Math.max(r.resourceLng, r.zoneLng),
            Math.max(r.resourceLat, r.zoneLat),
          ],
        ],
        { padding: 110, maxZoom: 14, duration: 700 }
      );
    }
  }, [selectedId, recommendations, ready]);

  return (
    <div
      style={{
        width: "100%",
        height: "480px",
        minHeight: "480px",
        borderRadius: "0.75rem",
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
      }}
    >
      {!isLoaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f1f5f9",
            fontSize: 12,
            fontWeight: 600,
            color: "#64748b",
          }}
        >
          Loading map…
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
