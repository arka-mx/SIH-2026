"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ReportItem, ResourceItem } from "@/lib/api";
import { RadicalRegionRule } from "@/types/rescuer";

interface LiveMapProps {
  incidents: ReportItem[];
  resources?: ResourceItem[];
  radicalRegions?: RadicalRegionRule[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: ReportItem) => void;
}

export function LiveMap({
  incidents = [],
  resources = [],
  radicalRegions = [],
  selectedIncidentId,
  onSelectIncident,
}: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center to coastal hub coordinates (19.0760, 72.8777)
    const map = L.map(mapContainerRef.current, {
      center: [19.076, 72.8777],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    const mapTilerMapId = process.env.NEXT_PUBLIC_MAPTILER_MAP_ID;

    // Standard OpenStreetMap raster tiles — genuinely free, no API key required.
    // (CARTO's basemaps.cartocdn.com raster endpoint now gates behind an API
    // key and returns "API KEY REQUIRED" placeholder tiles, so it can't be
    // used as the keyless default any more.)
    const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      maxZoom: 19,
      subdomains: "abc",
    });

    // Optional MapTiler layer if the user provides their own valid key in env
    if (mapTilerKey && mapTilerMapId) {
      const tileUrl = `https://api.maptiler.com/maps/${mapTilerMapId}/256/{z}/{x}/{y}.png?key=${mapTilerKey}`;
      const mapTilerLayer = L.tileLayer(tileUrl, {
        attribution: '&copy; MapTiler &copy; OpenStreetMap',
        maxZoom: 20,
        tileSize: 256,
        crossOrigin: true,
      });

      mapTilerLayer.on("tileerror", () => {
        if (!map.hasLayer(osmLayer)) {
          map.removeLayer(mapTilerLayer);
          osmLayer.addTo(map);
        }
      });

      mapTilerLayer.addTo(map);
    } else {
      osmLayer.addTo(map);
    }

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers and region overlays when incidents, resources, or radicalRegions change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    // 0. Render High-Risk / Radical Danger Zones as Circle Overlays
    radicalRegions.forEach((reg) => {
      if (!reg.enabled) return;
      const color = reg.riskLevel === "extreme_radical" ? "#e11d48" : "#f59e0b";
      const circle = L.circle([reg.centerLat, reg.centerLng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 2,
        dashArray: "6, 6",
        radius: (reg.radiusKm || 3) * 1000,
      });

      circle.bindPopup(`
        <div style="padding: 4px; font-size: 12px; font-family: sans-serif;">
          <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; background: ${reg.riskLevel === 'extreme_radical' ? '#ffe4e6' : '#fef3c7'}; color: ${reg.riskLevel === 'extreme_radical' ? '#9f1239' : '#92400e'}; padding: 2px 6px; border-radius: 4px;">
            ${reg.riskLevel.replace("_", " ")}
          </span>
          <strong style="font-size: 13px; display: block; margin-top: 4px; color: #0f172a;">${reg.regionName}</strong>
          <p style="margin-top: 4px; color: #475569; font-size: 11px;">
            Predetermined Permissions: <b>Auto-Broadcasting SOS Enabled</b><br/>
            Threshold: <b>${reg.autoDispatchThreshold} Citizen Report(s)</b><br/>
            Rescuer Authority: <b>${reg.rescuerAuthorityLevel.replace(/_/g, " ")}</b>
          </p>
        </div>
      `);

      markersLayer.addLayer(circle);
    });

    // 1. Render Incidents
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

      bounds.push([lat, lng]);

      const isSelected = selectedIncidentId === inc.id;
      const isVerified = inc.status === "verified";
      const isInProgress = inc.status === "in_progress";
      const isResolved = inc.status === "resolved";

      let toneBg = "#f59e0b"; // amber
      let statusLabel = "Unverified";

      if (isResolved) {
        toneBg = "#64748b"; // slate
        statusLabel = "Resolved";
      } else if (isInProgress) {
        toneBg = "#2563eb"; // blue
        statusLabel = "In Progress";
      } else if (isVerified) {
        toneBg = "#059669"; // emerald
        statusLabel = "Verified";
      }

      const customIcon = L.divIcon({
        className: "custom-incident-marker",
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${isVerified || isInProgress ? '<div style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background: rgba(16, 185, 129, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>' : ''}
            <div style="width: 28px; height: 28px; border-radius: 9999px; background: ${toneBg}; border: 2px solid white; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); ${isSelected ? 'transform: scale(1.25); outline: 3px solid #10b981;' : ''}">
              ${inc.type ? inc.type[0].toUpperCase() : "!"}
            </div>
            <div style="position: absolute; top: 30px; background: rgba(15, 23, 42, 0.9); color: white; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
              ${inc.type} (${statusLabel})
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      marker.on("click", () => {
        if (onSelectIncident) {
          onSelectIncident(inc);
        }
      });

      marker.bindPopup(`
        <div style="padding: 4px; font-size: 12px; font-family: sans-serif;">
          <strong style="text-transform: capitalize; font-size: 13px; display: block; color: #0f172a;">${inc.type} Incident</strong>
          <span style="display: inline-block; padding: 2px 6px; margin-top: 4px; border-radius: 4px; font-size: 10px; font-weight: 600; ${
            isVerified ? 'background: #d1fae5; color: #065f46;' : isInProgress ? 'background: #dbeafe; color: #1e40af;' : 'background: #fef3c7; color: #92400e;'
          }">${statusLabel}</span>
          <p style="margin-top: 6px; color: #475569; font-size: 11px;">${inc.description || "Emergency report filed"}</p>
          <small style="color: #94a3b8; font-family: monospace; display: block; margin-top: 4px;">ID: ${inc.id.slice(0, 8)}</small>
        </div>
      `);

      markersLayer.addLayer(marker);
    });

    // 2. Render Resources & Rescuer Teams
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
      bounds.push([lat, lng]);

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

      const resourceIcon = L.divIcon({
        className: "custom-resource-marker",
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 32px; height: 32px; border-radius: 8px; background: rgba(79, 70, 229, 0.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 28px; height: 28px; border-radius: 8px; background: ${isAvailable ? "#4f46e5" : "#0284c7"}; border: 2px solid white; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 13px;">
              ${resourceEmoji}
            </div>
            <div style="position: absolute; top: -16px; background: rgba(30, 27, 75, 0.95); color: white; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; white-space: nowrap;">
              ${res.name.split(' ')[0]} (${availableCap}/${res.capacity_total})
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const resMarker = L.marker([lat, lng], { icon: resourceIcon });
      resMarker.bindPopup(`
        <div style="padding: 4px; font-size: 12px; font-family: sans-serif;">
          <strong style="font-size: 13px; display: block; color: #0f172a;">${res.name}</strong>
          <span style="font-size: 10px; color: #4f46e5; font-weight: bold; text-transform: uppercase;">Type: ${res.type}</span>
          <p style="margin-top: 4px; color: #475569;">Available Capacity: <b>${availableCap}</b> / ${res.capacity_total}</p>
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background: #e0e7ff; color: #3730a3;">Status: ${res.status}</span>
        </div>
      `);

      markersLayer.addLayer(resMarker);
    });

    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch (e) {
        console.warn("Could not fit bounds:", e);
      }
    }
  }, [incidents, resources, radicalRegions, selectedIncidentId, onSelectIncident]);

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

