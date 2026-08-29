"use client";

import { useEffect, useRef, useState } from "react";
import { ReportItem, ResourceItem } from "@/lib/api";
import { RadicalRegionRule } from "@/types/rescuer";

interface LiveMapProps {
  incidents: ReportItem[];
  resources?: ResourceItem[];
  radicalRegions?: RadicalRegionRule[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: ReportItem) => void;
}

const OPENFREEMAP_STYLES = [
  { id: "liberty", name: "Liberty Vector", url: "https://tiles.openfreemap.org/styles/liberty" },
  { id: "bright", name: "Bright Vector", url: "https://tiles.openfreemap.org/styles/bright" },
  { id: "dark", name: "Dark Mode", url: "https://tiles.openfreemap.org/styles/dark" },
  { id: "positron", name: "Positron Light", url: "https://tiles.openfreemap.org/styles/positron" },
];

declare global {
  interface Window {
    maplibregl: any;
  }
}

// Generate GeoJSON Circle for Danger Zones
function createGeoJSONCircle(centerLng: number, centerLat: number, radiusInKm: number, points = 64) {
  const km = radiusInKm;
  const ret = [];
  const distanceX = km / (111.320 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([centerLng + x, centerLat + y]);
  }
  ret.push(ret[0]);

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [ret],
    },
  };
}

export function LiveMap({
  incidents = [],
  resources = [],
  radicalRegions = [],
  selectedIncidentId,
  onSelectIncident,
}: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [activeStyle, setActiveStyle] = useState<string>("liberty");
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // 1. Dynamically Load MapLibre GL JS CSS & Script from CDN
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
    script.onload = () => {
      setIsLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // 2. Initialize OpenFreeMap Instance
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const styleUrl = OPENFREEMAP_STYLES.find((s) => s.id === activeStyle)?.url || "https://tiles.openfreemap.org/styles/liberty";

    const map = new window.maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: [72.8777, 19.076], // [lng, lat]
      zoom: 13,
      pitch: 0,
      bearing: 0,
      attributionControl: true,
    });

    map.addControl(new window.maplibregl.NavigationControl(), "top-left");

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isLoaded]);

  // 3. Switch OpenFreeMap Style dynamically
  function handleStyleSwitch(styleId: string) {
    setActiveStyle(styleId);
    if (!mapInstanceRef.current) return;
    const selected = OPENFREEMAP_STYLES.find((s) => s.id === styleId);
    if (selected) {
      mapInstanceRef.current.setStyle(selected.url);
    }
  }

  // 4. Update Markers & GeoJSON Radical Regions when data or map changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds: [number, number][] = [];

    const renderLayersAndMarkers = () => {
      // A. Render Radical Region Circle Layers
      radicalRegions.forEach((reg, idx) => {
        if (!reg.enabled) return;
        const sourceId = `radical-source-${reg.id || idx}`;
        const fillLayerId = `radical-fill-${reg.id || idx}`;
        const lineLayerId = `radical-line-${reg.id || idx}`;

        const circleGeoJSON = createGeoJSONCircle(reg.centerLng, reg.centerLat, reg.radiusKm || 3);
        const color = reg.riskLevel === "extreme_radical" ? "#e11d48" : "#f59e0b";

        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as any).setData(circleGeoJSON);
        } else {
          map.addSource(sourceId, {
            type: "geojson",
            data: circleGeoJSON,
          });

          map.addLayer({
            id: fillLayerId,
            type: "fill",
            source: sourceId,
            paint: {
              "fill-color": color,
              "fill-opacity": 0.18,
            },
          });

          map.addLayer({
            id: lineLayerId,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": color,
              "line-width": 2,
              "line-dasharray": [3, 3],
            },
          });
        }
      });

      // B. Render Incidents
      incidents.forEach((inc) => {
        let lat = inc.lat;
        let lng = inc.lng;

        if ((lat === undefined || lng === undefined) && inc.location_wkt) {
          const match = inc.location_wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
          if (match) {
            lng = parseFloat(match[1]);
            lat = parseFloat(match[2]);
          }
        }

        if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return;
        bounds.push([lng, lat]);

        const isSelected = selectedIncidentId === inc.id;
        const isVerified = inc.status === "verified";
        const isInProgress = inc.status === "in_progress";
        const isResolved = inc.status === "resolved";

        let toneBg = "#f59e0b"; // amber
        let statusLabel = "Unverified";

        if (isResolved) {
          toneBg = "#64748b";
          statusLabel = "Resolved";
        } else if (isInProgress) {
          toneBg = "#2563eb";
          statusLabel = "In Progress";
        } else if (isVerified) {
          toneBg = "#059669";
          statusLabel = "Verified";
        }

        const el = document.createElement("div");
        el.className = "openfreemap-incident-marker";
        el.style.cssText = "position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;";
        el.innerHTML = `
          ${isVerified || isInProgress ? '<div style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background: rgba(16, 185, 129, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>' : ""}
          <div style="width: 28px; height: 28px; border-radius: 9999px; background: ${toneBg}; border: 2px solid white; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); ${isSelected ? "transform: scale(1.25); outline: 3px solid #10b981;" : ""}">
            ${inc.type ? inc.type[0].toUpperCase() : "!"}
          </div>
          <div style="position: absolute; top: 30px; background: rgba(15, 23, 42, 0.95); color: white; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            ${inc.type} (${statusLabel})
          </div>
        `;

        el.addEventListener("click", () => {
          if (onSelectIncident) onSelectIncident(inc);
        });

        const popup = new window.maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 4px; font-size: 12px; font-family: sans-serif;">
            <strong style="text-transform: capitalize; font-size: 13px; display: block; color: #0f172a;">${inc.type} Incident</strong>
            <span style="display: inline-block; padding: 2px 6px; margin-top: 4px; border-radius: 4px; font-size: 10px; font-weight: 600; ${
              isVerified ? "background: #d1fae5; color: #065f46;" : isInProgress ? "background: #dbeafe; color: #1e40af;" : "background: #fef3c7; color: #92400e;"
            }">${statusLabel}</span>
            <p style="margin-top: 6px; color: #475569; font-size: 11px;">${inc.description || "Emergency report filed"}</p>
            <small style="color: #94a3b8; font-family: monospace; display: block; margin-top: 4px;">ID: ${inc.id.slice(0, 8)}</small>
          </div>
        `);

        const marker = new window.maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      // C. Render Resources & Rescue Teams
      resources.forEach((res) => {
        let lat = res.lat;
        let lng = res.lng;

        if ((lat === undefined || lng === undefined) && res.location_wkt) {
          const match = res.location_wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
          if (match) {
            lng = parseFloat(match[1]);
            lat = parseFloat(match[2]);
          }
        }

        if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return;
        bounds.push([lng, lat]);

        const availableCap = (res.capacity_total || 0) - (res.capacity_used || 0);
        const isAvailable = res.status === "available" && availableCap > 0;

        const resourceEmoji =
          res.type === "boat"
            ? "🚤"
            : res.type === "shelter"
            ? "⛺"
            : res.type === "ambulance" || res.type === "medical_van"
            ? "🚑"
            : "🚒";

        const el = document.createElement("div");
        el.className = "openfreemap-resource-marker";
        el.style.cssText = "position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;";
        el.innerHTML = `
          <div style="position: absolute; width: 32px; height: 32px; border-radius: 8px; background: rgba(79, 70, 229, 0.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 28px; height: 28px; border-radius: 8px; background: ${isAvailable ? "#4f46e5" : "#0284c7"}; border: 2px solid white; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 13px;">
            ${resourceEmoji}
          </div>
          <div style="position: absolute; top: -16px; background: rgba(30, 27, 75, 0.95); color: white; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; white-space: nowrap;">
            ${res.name.split(" ")[0]} (${availableCap}/${res.capacity_total})
          </div>
        `;

        const popup = new window.maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 4px; font-size: 12px; font-family: sans-serif;">
            <strong style="font-size: 13px; display: block; color: #0f172a;">${res.name}</strong>
            <span style="font-size: 10px; color: #4f46e5; font-weight: bold; text-transform: uppercase;">Type: ${res.type}</span>
            <p style="margin-top: 4px; color: #475569;">Available Capacity: <b>${availableCap}</b> / ${res.capacity_total}</p>
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background: #e0e7ff; color: #3730a3;">Status: ${res.status}</span>
          </div>
        `);

        const marker = new window.maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      // D. Fit bounds if points exist
      if (bounds.length > 0) {
        try {
          const lats = bounds.map((b) => b[1]);
          const lngs = bounds.map((b) => b[0]);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);

          map.fitBounds(
            [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
            { padding: 50, maxZoom: 14, duration: 1000 }
          );
        } catch (e) {
          console.warn("Could not fit OpenFreeMap bounds:", e);
        }
      }
    };

    if (map.isStyleLoaded()) {
      renderLayersAndMarkers();
    } else {
      map.once("style.load", renderLayersAndMarkers);
    }
  }, [incidents, resources, radicalRegions, selectedIncidentId, onSelectIncident, isLoaded, activeStyle]);

  return (
    <div
      style={{
        width: "100%",
        height: "460px",
        minHeight: "460px",
        borderRadius: "0.75rem",
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* OpenFreeMap Style Switcher Bar */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 10,
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(8px)",
          padding: "4px 8px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          border: "1px solid rgba(255, 255, 255, 0.15)",
        }}
      >
        <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "bold", textTransform: "uppercase", paddingRight: "4px" }}>
          🗺️ OpenFreeMap:
        </span>
        {OPENFREEMAP_STYLES.map((st) => (
          <button
            key={st.id}
            onClick={() => handleStyleSwitch(st.id)}
            style={{
              padding: "3px 8px",
              borderRadius: "5px",
              fontSize: "11px",
              fontWeight: "bold",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
              background: activeStyle === st.id ? "#3b82f6" : "rgba(255, 255, 255, 0.1)",
              color: activeStyle === st.id ? "#ffffff" : "#cbd5e1",
            }}
          >
            {st.name}
          </button>
        ))}
      </div>

      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "460px",
        }}
      />
    </div>
  );
}


