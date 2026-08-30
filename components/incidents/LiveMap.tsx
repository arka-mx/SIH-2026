"use client";

import { useEffect, useRef, useState } from "react";
import { ReportItem, ResourceItem, AllocationLine } from "@/lib/api";
import { RadicalRegionRule, RescuerUnitProfile } from "@/types/rescuer";
import { getStoredAdminLocation } from "@/lib/adminLocation";

interface LiveMapProps {
  incidents: ReportItem[];
  resources?: ResourceItem[];
  rescuers?: RescuerUnitProfile[];
  allocations?: AllocationLine[];
  radicalRegions?: RadicalRegionRule[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: ReportItem) => void;
}

const RESCUER_VEHICLE_ICON: Record<string, string> = {
  boat: "🚤",
  ambulance: "🚑",
  medical_van: "🚑",
  rescue_team: "🚒",
  shelter: "🚚",
};

const RESCUER_STATUS_COLOR: Record<string, string> = {
  available: "#059669",
  en_route: "#2563eb",
  at_scene: "#e11d48",
  resting: "#64748b",
};

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

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function LiveMap({
  incidents = [],
  resources = [],
  rescuers = [],
  allocations = [],
  radicalRegions = [],
  selectedIncidentId,
  onSelectIncident,
}: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [activeStyle, setActiveStyle] = useState<string>("liberty");
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [layers, setLayers] = useState({ incidents: true, teams: true, zones: true });
  const [nearestMatch, setNearestMatch] = useState<{ name: string; type: string; distance: number } | null>(null);

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

    // Start on the admin's chosen operating area (fitBounds takes over once
    // there are incidents/resources to frame). Falls back to a national view.
    const adminLoc = getStoredAdminLocation();
    const initialCenter: [number, number] =
      adminLoc && adminLoc.lat != null && adminLoc.lng != null
        ? [adminLoc.lng, adminLoc.lat]
        : [78.9629, 22.5937];

    const map = new window.maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: initialCenter, // [lng, lat]
      zoom: adminLoc ? 12 : 4,
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
        const sourceId = `radical-source-${reg.id || idx}`;
        const fillLayerId = `radical-fill-${reg.id || idx}`;
        const lineLayerId = `radical-line-${reg.id || idx}`;

        const shouldShow = reg.enabled && layers.zones;
        if (!shouldShow) {
          if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
          if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
          return;
        }

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
      (layers.incidents ? incidents : []).forEach((inc) => {
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

        const sevColor: Record<string, string> = {
          critical: "#b91c1c",
          high: "#c2410c",
          moderate: "#a16207",
          low: "#3f6212",
        };
        const sev = (inc.severity || "").toLowerCase();
        const verifLabel = inc.verification?.tierLabel;
        const verifScore = inc.verification?.score;
        const reportedAt = inc.created_at
          ? new Date(inc.created_at).toLocaleString([], {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          : null;

        const popup = new window.maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 4px; font-size: 12px; font-family: sans-serif; min-width: 190px;">
            <strong style="text-transform: capitalize; font-size: 13px; display: block; color: #0f172a;">${inc.type} Incident</strong>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
              <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; ${
                isVerified ? "background: #d1fae5; color: #065f46;" : isInProgress ? "background: #dbeafe; color: #1e40af;" : "background: #fef3c7; color: #92400e;"
              }">${statusLabel}</span>
              ${
                sev
                  ? `<span style="display:inline-block; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600; text-transform:capitalize; background:${sevColor[sev] || "#475569"}; color:#fff;">${sev} severity</span>`
                  : ""
              }
              ${
                verifLabel
                  ? `<span style="display:inline-block; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600; background:#ede9fe; color:#5b21b6;">${verifLabel}${typeof verifScore === "number" ? ` ${verifScore}` : ""}</span>`
                  : ""
              }
            </div>
            <p style="margin-top: 6px; color: #475569; font-size: 11px;">${inc.description || "Emergency report filed"}</p>
            ${reportedAt ? `<div style="color:#64748b; font-size:10px; margin-top:4px;">Reported ${reportedAt}${inc.report_count && inc.report_count > 1 ? ` · ${inc.report_count} reports` : ""}</div>` : ""}
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
      (layers.teams ? resources : []).forEach((res) => {
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

      // C2. Render Live Rescuer / Resource Giver GPS Pins
      (layers.teams ? rescuers : []).forEach((unit) => {
        const lat = unit.lat;
        const lng = unit.lng;
        if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return;
        bounds.push([lng, lat]);

        const ring = RESCUER_STATUS_COLOR[unit.status] || "#059669";
        const emoji = RESCUER_VEHICLE_ICON[unit.type] || "🚒";
        const beds = unit.supplies.shelterBedsTotal > 0
          ? `${unit.supplies.shelterBedsAvailable}/${unit.supplies.shelterBedsTotal} beds`
          : `${unit.supplies.lifeJackets} jackets · ${unit.supplies.medicalKits} med kits`;

        const el = document.createElement("div");
        el.className = "openfreemap-rescuer-marker";
        el.style.cssText = "position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;";
        el.innerHTML = `
          <div style="position: absolute; width: 38px; height: 38px; border-radius: 9999px; background: ${ring}55; animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 30px; height: 30px; border-radius: 9999px; background: white; border: 3px solid ${ring}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 14px;">
            ${emoji}
          </div>
          <div style="position: absolute; top: -16px; background: ${ring}; color: white; font-size: 9px; padding: 1px 5px; border-radius: 3px; font-weight: bold; white-space: nowrap;">
            ${unit.callsign}
          </div>
        `;

        const popup = new window.maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 4px; font-size: 12px; font-family: sans-serif;">
            <strong style="font-size: 13px; display: block; color: #0f172a;">${unit.name}</strong>
            <span style="font-size: 10px; color: ${ring}; font-weight: bold; text-transform: uppercase;">${unit.type.replace("_", " ")} · ${unit.status.replace("_", " ")}</span>
            <p style="margin-top: 4px; color: #475569;">Capacity: <b>${beds}</b></p>
            <p style="margin-top: 2px; color: #475569;">Lead: ${unit.leaderName} · ${unit.phone}</p>
            ${unit.assignedReportId ? `<small style="color: #94a3b8; font-family: monospace;">Assigned: ${unit.assignedReportId}</small>` : ""}
          </div>
        `);

        const marker = new window.maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      // C2b. Persistent allocation connectors (recommended + confirmed).
      // These stay on the map regardless of selection so the operator can see
      // the whole coordination picture: which resource is going where.
      const allocConfirmedSrc = "alloc-confirmed-source";
      const allocRecommendedSrc = "alloc-recommended-source";
      const allocConfirmedLayer = "alloc-confirmed-layer";
      const allocRecommendedLayer = "alloc-recommended-layer";

      const toLineFeature = (a: AllocationLine) => ({
        type: "Feature" as const,
        properties: { status: a.status, resource: a.resource_name, eta: a.eta_min },
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [a.incident_lng, a.incident_lat],
            [a.resource_lng, a.resource_lat],
          ],
        },
      });

      const validAlloc = allocations.filter(
        (a) =>
          Number.isFinite(a.incident_lat) &&
          Number.isFinite(a.incident_lng) &&
          Number.isFinite(a.resource_lat) &&
          Number.isFinite(a.resource_lng)
      );
      const confirmedFC = {
        type: "FeatureCollection" as const,
        features: validAlloc
          .filter((a) => a.status === "en_route" || a.status === "at_scene")
          .map(toLineFeature),
      };
      const recommendedFC = {
        type: "FeatureCollection" as const,
        features: validAlloc
          .filter((a) => a.status === "recommended")
          .map(toLineFeature),
      };

      const upsertLineLayer = (
        srcId: string,
        layerId: string,
        data: object,
        paint: Record<string, unknown>
      ) => {
        const existing = map.getSource(srcId);
        if (existing) {
          existing.setData(data);
        } else {
          map.addSource(srcId, { type: "geojson", data });
          map.addLayer({ id: layerId, type: "line", source: srcId, paint });
        }
      };

      upsertLineLayer(allocConfirmedSrc, allocConfirmedLayer, confirmedFC, {
        "line-color": [
          "match",
          ["get", "status"],
          "at_scene",
          "#dc2626",
          "#2563eb",
        ],
        "line-width": 3,
      });
      upsertLineLayer(allocRecommendedSrc, allocRecommendedLayer, recommendedFC, {
        "line-color": "#d97706",
        "line-width": 2.5,
        "line-dasharray": [2, 2],
      });

      const allocatedIncidentIds = new Set(validAlloc.map((a) => a.report_id));

      // C3. Calculate Nearest Available Resource and render dashed line
      const selectedInc = selectedIncidentId ? incidents.find((i) => i.id === selectedIncidentId) : null;
      let selectedLat: number | undefined;
      let selectedLng: number | undefined;

      if (selectedInc) {
        selectedLat = selectedInc.lat;
        selectedLng = selectedInc.lng;
        if ((selectedLat === undefined || selectedLng === undefined) && selectedInc.location_wkt) {
          const match = selectedInc.location_wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
          if (match) {
            selectedLng = parseFloat(match[1]);
            selectedLat = parseFloat(match[2]);
          }
        }
      }

      const lineSourceId = "allocation-line-source";
      const lineLayerId = "allocation-line-layer";

      let matched: { name: string; type: string; lat: number; lng: number; distance: number } | null = null;

      if (
        selectedInc &&
        !allocatedIncidentIds.has(selectedInc.id) &&
        selectedLat !== undefined &&
        selectedLng !== undefined &&
        !isNaN(selectedLat) &&
        !isNaN(selectedLng)
      ) {
        let minDistance = Infinity;

        // Check Shelters / Supply Centres
        for (const res of resources) {
          let resLat = res.lat;
          let resLng = res.lng;
          if ((resLat === undefined || resLng === undefined) && res.location_wkt) {
            const match = res.location_wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
            if (match) {
              resLng = parseFloat(match[1]);
              resLat = parseFloat(match[2]);
            }
          }
          if (resLat === undefined || resLng === undefined || isNaN(resLat) || isNaN(resLng)) continue;
          
          const availableCap = (res.capacity_total || 0) - (res.capacity_used || 0);
          if (availableCap <= 0) continue; // Full capacity shelter

          const dist = getDistance(selectedLat!, selectedLng!, resLat, resLng);
          if (dist < minDistance) {
            minDistance = dist;
            matched = { name: res.name, type: res.type, lat: resLat, lng: resLng, distance: dist };
          }
        }

        // Check Rescuer units
        for (const resc of rescuers) {
          if (resc.status !== "available" || resc.lat === undefined || resc.lng === undefined || isNaN(resc.lat) || isNaN(resc.lng)) continue;
          const dist = getDistance(selectedLat!, selectedLng!, resc.lat, resc.lng);
          if (dist < minDistance) {
            minDistance = dist;
            matched = { name: resc.callsign || resc.name, type: resc.type, lat: resc.lat, lng: resc.lng, distance: dist };
          }
        }

        if (matched) {
          const lineGeoJSON = {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [selectedLng, selectedLat],
                [matched.lng, matched.lat],
              ],
            },
          };

          if (map.getSource(lineSourceId)) {
            (map.getSource(lineSourceId) as any).setData(lineGeoJSON);
          } else {
            map.addSource(lineSourceId, {
              type: "geojson",
              data: lineGeoJSON,
            });
            map.addLayer({
              id: lineLayerId,
              type: "line",
              source: lineSourceId,
              paint: {
                "line-color": "#d96d25", // Orange/Saffron matching vector
                "line-width": 3,
                "line-dasharray": [3, 2],
              },
            });
          }
          setNearestMatch(matched);
        } else {
          if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
          if (map.getSource(lineSourceId)) map.removeSource(lineSourceId);
          setNearestMatch(null);
        }
      } else {
        if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
        if (map.getSource(lineSourceId)) map.removeSource(lineSourceId);
        setNearestMatch(null);
      }

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
  }, [incidents, resources, rescuers, allocations, radicalRegions, layers, selectedIncidentId, onSelectIncident, isLoaded, activeStyle]);

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

      {/* Layer Filter Bar */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "50px",
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
          Layers:
        </span>
        {([
          { key: "incidents", label: "Incidents" },
          { key: "teams", label: "Teams / Givers" },
          { key: "zones", label: "Danger Zones" },
        ] as const).map((l) => (
          <button
            key={l.key}
            onClick={() => setLayers((prev) => ({ ...prev, [l.key]: !prev[l.key] }))}
            style={{
              padding: "3px 8px",
              borderRadius: "5px",
              fontSize: "11px",
              fontWeight: "bold",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
              background: layers[l.key] ? "#3b82f6" : "rgba(255, 255, 255, 0.1)",
              color: layers[l.key] ? "#ffffff" : "#cbd5e1",
            }}
          >
            {layers[l.key] ? "● " : "○ "}{l.label}
          </button>
        ))}
      </div>

      {/* Floating Nearest Resource Recommendation Card */}
      {nearestMatch && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            zIndex: 10,
            background: "rgba(255, 253, 246, 0.95)",
            border: "1px solid #eadaab",
            padding: "12px 14px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(104,70,42,0.15)",
            maxWidth: "280px",
            color: "#3c2415"
          }}
        >
          <span style={{ fontSize: "9px", color: "#d96d25", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            🤖 AI AUTO-ALLOCATOR RECOMMENDATION
          </span>
          <div style={{ fontSize: "12px", fontWeight: "bold", marginTop: "3px", textTransform: "capitalize" }}>
            {nearestMatch.name}
          </div>
          <div style={{ fontSize: "10px", color: "#665548", marginTop: "2px" }}>
            Type: <span style={{ textTransform: "capitalize", fontWeight: "600" }}>{nearestMatch.type.replace("_", " ")}</span> · Distance: <b>{nearestMatch.distance.toFixed(2)} km</b>
          </div>
          <div style={{ fontSize: "10px", color: "#254b34", background: "#d7ebc9", padding: "3px 6px", borderRadius: "4px", marginTop: "6px", fontWeight: "bold", display: "inline-block" }}>
            ✓ Closest Available Rescuer/Camp
          </div>
        </div>
      )}

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