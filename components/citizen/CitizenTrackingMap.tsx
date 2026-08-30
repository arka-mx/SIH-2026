"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair } from "lucide-react";

interface CitizenTrackingMapProps {
  reportLat: number;
  reportLng: number;
  reportType: string;
  rescuerLat?: number;
  rescuerLng?: number;
  rescuerName?: string;
  rescuerType?: string;
  shelterLat?: number;
  shelterLng?: number;
  shelterName?: string;
}

export function CitizenTrackingMap({
  reportLat,
  reportLng,
  reportType,
  rescuerLat,
  rescuerLng,
  rescuerName,
  rescuerType,
  shelterLat,
  shelterLng,
  shelterName,
}: CitizenTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Recenter the view on the citizen's distress location (the coordinates from
  // the SOS), undoing any pan/zoom drift from auto-fit or manual panning.
  function resetView() {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.easeTo({ center: [reportLng, reportLat], zoom: 14, pitch: 0, bearing: 0, duration: 500 });
  }

  // Load MapLibre script and styles from CDN
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

  // Initialize Map
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = new window.maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [reportLng, reportLat],
      zoom: 13,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isLoaded, reportLat, reportLng]);

  // Render Markers and Paths
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isLoaded) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds: [number, number][] = [[reportLng, reportLat]];

    const drawElements = () => {
      // 1. Citizen Marker (Saffron Pin)
      const citizenEl = document.createElement("div");
      citizenEl.style.cssText = "position: relative; display: flex; align-items: center; justify-content: center;";
      citizenEl.innerHTML = `
        <div style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background: rgba(217, 109, 37, 0.4); animation: ping 1.5s infinite;"></div>
        <div style="width: 26px; height: 26px; border-radius: 9999px; background: #d96d25; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
          🚨
        </div>
        <div style="position: absolute; top: 28px; background: rgba(15, 23, 42, 0.9); color: white; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px; white-space: nowrap;">
          Your distress location
        </div>
      `;
      const citizenMarker = new window.maplibregl.Marker({ element: citizenEl })
        .setLngLat([reportLng, reportLat])
        .addTo(map);
      markersRef.current.push(citizenMarker);

      // 2. Rescuer Marker & Path (Dashed Blue Line)
      if (rescuerLat !== undefined && rescuerLng !== undefined) {
        bounds.push([rescuerLng, rescuerLat]);
        const rescuerEmoji = rescuerType === "boat" ? "🚤" : rescuerType === "ambulance" ? "🚑" : "🚒";
        const rescuerEl = document.createElement("div");
        rescuerEl.style.cssText = "position: relative; display: flex; align-items: center; justify-content: center;";
        rescuerEl.innerHTML = `
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background: rgba(37, 99, 235, 0.4); animation: ping 2s infinite;"></div>
          <div style="width: 26px; height: 26px; border-radius: 9999px; background: white; border: 3px solid #2563eb; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
            ${rescuerEmoji}
          </div>
          <div style="position: absolute; top: -18px; background: #2563eb; color: white; font-size: 8px; font-weight: bold; padding: 1px 4px; border-radius: 3px; white-space: nowrap;">
            Assigned Rescuer: ${rescuerName}
          </div>
        `;
        const rescuerMarker = new window.maplibregl.Marker({ element: rescuerEl })
          .setLngLat([rescuerLng, rescuerLat])
          .addTo(map);
        markersRef.current.push(rescuerMarker);

        const lineGeoJSON = {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [rescuerLng, rescuerLat],
              [reportLng, reportLat],
            ],
          },
        };

        if (map.getSource("citizen-rescuer-source")) {
          (map.getSource("citizen-rescuer-source") as any).setData(lineGeoJSON);
        } else {
          map.addSource("citizen-rescuer-source", { type: "geojson", data: lineGeoJSON });
          map.addLayer({
            id: "citizen-rescuer-layer",
            type: "line",
            source: "citizen-rescuer-source",
            paint: {
              "line-color": "#2563eb",
              "line-width": 3,
              "line-dasharray": [3, 2],
            },
          });
        }
      }

      // 3. Shelter Marker & Path (Dashed Green Line)
      if (shelterLat !== undefined && shelterLng !== undefined) {
        bounds.push([shelterLng, shelterLat]);
        const shelterEl = document.createElement("div");
        shelterEl.style.cssText = "position: relative; display: flex; align-items: center; justify-content: center;";
        shelterEl.innerHTML = `
          <div style="width: 26px; height: 26px; border-radius: 6px; background: white; border: 3px solid #059669; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
            ⛺
          </div>
          <div style="position: absolute; top: 28px; background: #059669; color: white; font-size: 8px; font-weight: bold; padding: 1px 4px; border-radius: 3px; white-space: nowrap;">
            Nearest Shelter: ${shelterName}
          </div>
        `;
        const shelterMarker = new window.maplibregl.Marker({ element: shelterEl })
          .setLngLat([shelterLng, shelterLat])
          .addTo(map);
        markersRef.current.push(shelterMarker);

        const shelterLineGeoJSON = {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [reportLng, reportLat],
              [shelterLng, shelterLat],
            ],
          },
        };

        if (map.getSource("citizen-shelter-source")) {
          (map.getSource("citizen-shelter-source") as any).setData(shelterLineGeoJSON);
        } else {
          map.addSource("citizen-shelter-source", { type: "geojson", data: shelterLineGeoJSON });
          map.addLayer({
            id: "citizen-shelter-layer",
            type: "line",
            source: "citizen-shelter-source",
            paint: {
              "line-color": "#059669",
              "line-width": 2,
              "line-dasharray": [4, 4],
            },
          });
        }
      }

      // Auto zoom to fit elements
      if (bounds.length > 1) {
        try {
          const lats = bounds.map((b) => b[1]);
          const lngs = bounds.map((b) => b[0]);
          map.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: 30, maxZoom: 14 }
          );
        } catch (e) {
          console.warn("Could not fit bounds:", e);
        }
      }
    };

    if (map.isStyleLoaded()) {
      drawElements();
    } else {
      map.once("style.load", drawElements);
    }
  }, [isLoaded, reportLat, reportLng, rescuerLat, rescuerLng, shelterLat, shelterLng]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "180px",
        borderRadius: "10px",
        border: "1px solid #ebdcc5",
        overflow: "hidden",
        marginTop: "12px",
      }}
    >
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      <button
        type="button"
        onClick={resetView}
        title="Recenter on your location"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 9px",
          fontSize: 11,
          fontWeight: 700,
          color: "#0f172a",
          background: "rgba(255,255,255,0.92)",
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          cursor: "pointer",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      >
        <Crosshair size={12} /> Reset view
      </button>
    </div>
  );
}
