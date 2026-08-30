"use client";

import { useEffect, useRef, useState } from "react";
import { HeatPoint, HeatZone } from "@/lib/disasterHeat";

interface DisasterHeatmapMapProps {
  points: HeatPoint[];
  zones: HeatZone[];
  base: { lat: number; lng: number; label?: string } | null;
  selectedZoneKey?: string | null;
  onSelectZone?: (key: string) => void;
}

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const SOURCE_ID = "disaster-heat-source";
const HEAT_LAYER_ID = "disaster-heat-layer";
const RING_SOURCE_ID = "admin-range-ring";
const RING_LAYER_ID = "admin-range-ring-fill";

function ringGeoJSON(lat: number, lng: number, radiusKm: number, steps = 72) {
  const coords: [number, number][] = [];
  const dx = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const dy = radiusKm / 110.574;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    coords.push([lng + dx * Math.cos(t), lat + dy * Math.sin(t)]);
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [coords] },
  };
}

function pointsFC(points: HeatPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((p) => ({
      type: "Feature" as const,
      properties: { weight: p.weight },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
    })),
  };
}

export function DisasterHeatmapMap({
  points,
  zones,
  base,
  selectedZoneKey,
  onSelectZone,
}: DisasterHeatmapMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [ready, setReady] = useState(false);

  // 1. Load MapLibre GL from CDN (same approach as the incident LiveMap).
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

  // 2. Init map centered on the admin's operating location.
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

  // 3. Paint the heatmap layer + range ring.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const data = pointsFC(points);
    if (map.getSource(SOURCE_ID)) {
      (map.getSource(SOURCE_ID) as any).setData(data);
    } else {
      map.addSource(SOURCE_ID, { type: "geojson", data });
      map.addLayer({
        id: HEAT_LAYER_ID,
        type: "heatmap",
        source: SOURCE_ID,
        paint: {
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["get", "weight"],
            0,
            0,
            3,
            1,
          ],
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            1,
            14,
            3,
          ],
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            18,
            11,
            38,
            15,
            60,
          ],
          "heatmap-opacity": 0.75,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(33,102,172,0)",
            0.2,
            "rgba(103,169,207,0.65)",
            0.4,
            "rgb(253,219,120)",
            0.6,
            "rgb(244,150,60)",
            0.8,
            "rgb(222,80,40)",
            1,
            "rgb(160,20,20)",
          ],
        },
      });
    }

    if (base && base.lat != null && base.lng != null) {
      const ring = ringGeoJSON(base.lat, base.lng, 10);
      if (map.getSource(RING_SOURCE_ID)) {
        (map.getSource(RING_SOURCE_ID) as any).setData(ring);
      } else {
        map.addSource(RING_SOURCE_ID, { type: "geojson", data: ring });
        map.addLayer({
          id: RING_LAYER_ID,
          type: "line",
          source: RING_SOURCE_ID,
          paint: {
            "line-color": "#1d4ed8",
            "line-width": 1.5,
            "line-dasharray": [3, 3],
            "line-opacity": 0.6,
          },
        });
      }
    }
  }, [points, base, ready]);

  // 4. Zone + admin markers, and framing.
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

    zones.forEach((z) => {
      frame.push([z.lng, z.lat]);
      const selected = selectedZoneKey === z.key;
      const color =
        z.intensity >= 4 ? "#a01414" : z.intensity >= 2 ? "#de5028" : "#f0a500";
      const size = Math.max(20, Math.min(20 + z.intensity * 6, 46));

      const el = document.createElement("div");
      el.style.cssText = `position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;`;
      el.innerHTML = `
        <div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};opacity:.28;position:absolute;"></div>
        <div style="width:18px;height:18px;border-radius:9999px;background:${color};border:2px solid #fff;color:#fff;font:700 10px sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,.3);${
          selected ? "outline:3px solid #1d4ed8;" : ""
        }">${z.points.length}</div>`;
      el.addEventListener("click", () => onSelectZone?.(z.key));

      const marker = new window.maplibregl.Marker({ element: el })
        .setLngLat([z.lng, z.lat])
        .setPopup(
          new window.maplibregl.Popup({ offset: 16 }).setHTML(
            `<div style="font:12px sans-serif;padding:2px 4px;max-width:200px;">
              <b style="text-transform:capitalize;">${z.types.join(", ")}</b><br/>
              Heat index: <b>${z.intensity.toFixed(1)}</b><br/>
              ${z.points.length} incident(s) · ${z.reports} report(s)${
              z.injured ? ` · ${z.injured} injured` : ""
            }<br/>
              <span style="color:#64748b;">${z.label}</span>
            </div>`
          )
        )
        .addTo(map);
      markersRef.current.push(marker);
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
  }, [zones, base, ready, selectedZoneKey, onSelectZone]);

  // Pan to a zone selected from the side list.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedZoneKey) return;
    const z = zones.find((x) => x.key === selectedZoneKey);
    if (z) map.flyTo({ center: [z.lng, z.lat], zoom: 13, duration: 700 });
  }, [selectedZoneKey, zones, ready]);

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
          Loading heatmap…
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
