"use client";

import { useEffect, useRef, useState } from "react";
import { ReportItem, calcDistanceKm, apiPollRescuerMovement } from "@/lib/api";
import { RescuerUnitProfile } from "@/types/rescuer";
import { Navigation, Phone, ShieldAlert, CheckCircle2, Clock, MapPin, Radio, Zap, AlertTriangle } from "lucide-react";

interface CitizenLiveTrackingMapProps {
  incident: ReportItem;
  onIncidentUpdated?: (updated: ReportItem) => void;
}

const VEHICLE_EMOJI: Record<string, string> = {
  boat: "🚤",
  ambulance: "🚑",
  medical_van: "🚑",
  rescue_team: "🚒",
  shelter: "🚚",
  fire_engine: "🚒",
};

declare global {
  interface Window {
    maplibregl: any;
  }
}

export function CitizenLiveTrackingMap({ incident, onIncidentUpdated }: CitizenLiveTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const citizenMarkerRef = useRef<any>(null);
  const rescuerMarkerRef = useRef<any>(null);

  const [currentIncident, setCurrentIncident] = useState<ReportItem>(incident);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(true);

  // Keep local state synced if parent prop updates
  useEffect(() => {
    setCurrentIncident(incident);
  }, [incident]);

  // Load MapLibre JS & CSS from CDN if needed
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

  // Poll live rescuer movement every 2.5 seconds
  useEffect(() => {
    if (!isPolling || !currentIncident.assigned_rescuer || currentIncident.rescuer_status === "arrived") {
      return;
    }

    const interval = setInterval(async () => {
      const updated = await apiPollRescuerMovement(currentIncident.id);
      if (updated) {
        setCurrentIncident(updated);
        if (onIncidentUpdated) {
          onIncidentUpdated(updated);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [currentIncident.id, currentIncident.assigned_rescuer, isPolling]);

  const citizenLat = currentIncident.lat || 19.076;
  const citizenLng = currentIncident.lng || 72.8777;
  const rescuer = currentIncident.assigned_rescuer;

  const distanceKm = rescuer
    ? calcDistanceKm(citizenLat, citizenLng, rescuer.lat, rescuer.lng)
    : 0;

  // Calculate ETA (assuming average speed 40 km/h)
  const etaMinutes = Math.max(1, Math.round((distanceKm / 40) * 60));
  const isArrived = currentIncident.rescuer_status === "arrived" || distanceKm < 0.05;

  // Initialize MapLibre
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const map = new window.maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [citizenLng, citizenLat],
      zoom: 14,
      pitch: 30,
    });

    map.addControl(new window.maplibregl.NavigationControl(), "top-left");

    map.on("load", () => {
      mapInstanceRef.current = map;
      updateMarkersAndRoute(map);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isLoaded]);

  // Update map markers & dashed route when rescuer coordinates update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    updateMarkersAndRoute(map);
  }, [currentIncident.assigned_rescuer?.lat, currentIncident.assigned_rescuer?.lng]);

  function updateMarkersAndRoute(map: any) {
    if (!map) return;

    // 1. Citizen Marker (Red Pulse)
    if (!citizenMarkerRef.current) {
      const citizenEl = document.createElement("div");
      citizenEl.className = "citizen-sos-pulse-marker";
      citizenEl.innerHTML = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;">
          <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: rgba(225, 29, 72, 0.4); animation: ping 1.5s infinite;"></div>
          <div style="width: 32px; height: 32px; border-radius: 50%; background: #e11d48; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            🚨
          </div>
        </div>
      `;
      citizenMarkerRef.current = new window.maplibregl.Marker({ element: citizenEl })
        .setLngLat([citizenLng, citizenLat])
        .setPopup(
          new window.maplibregl.Popup({ offset: 25 }).setHTML(
            `<strong style="color: #e11d48">Your Emergency Location</strong><br/>${currentIncident.address || "Help Requested"}`
          )
        )
        .addTo(map);
    }

    // 2. Rescuer Unit Marker (Vehicle Emoji)
    if (rescuer) {
      const iconEmoji = VEHICLE_EMOJI[rescuer.type] || "🚒";
      if (!rescuerMarkerRef.current) {
        const rescuerEl = document.createElement("div");
        rescuerEl.className = "rescuer-live-vehicle-marker";
        rescuerEl.innerHTML = `
          <div style="background: #2563eb; color: white; padding: 6px 10px; border-radius: 20px; font-weight: bold; font-size: 13px; display: flex; align-items: center; gap: 6px; border: 2px solid white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4); transition: transform 0.3s ease;">
            <span style="font-size: 16px;">${iconEmoji}</span>
            <span>${rescuer.callsign || rescuer.name.split(" ")[0]}</span>
          </div>
        `;
        rescuerMarkerRef.current = new window.maplibregl.Marker({ element: rescuerEl })
          .setLngLat([rescuer.lng, rescuer.lat])
          .setPopup(
            new window.maplibregl.Popup({ offset: 25 }).setHTML(
              `<strong>${rescuer.name}</strong><br/>Status: En Route<br/>Phone: ${rescuer.phone}`
            )
          )
          .addTo(map);
      } else {
        rescuerMarkerRef.current.setLngLat([rescuer.lng, rescuer.lat]);
      }

      // 3. Route Line
      const routeGeoJSON = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [rescuer.lng, rescuer.lat],
            [citizenLng, citizenLat],
          ],
        },
      };

      if (map.getSource("rescuer-route")) {
        map.getSource("rescuer-route").setData(routeGeoJSON);
      } else {
        map.addSource("rescuer-route", {
          type: "geojson",
          data: routeGeoJSON,
        });

        map.addLayer({
          id: "rescuer-route-line",
          type: "line",
          source: "rescuer-route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#2563eb",
            "line-width": 4,
            "line-dasharray": [2, 2],
          },
        });
      }

      // Fit map bounds to encompass citizen and rescuer
      const bounds = new window.maplibregl.LngLatBounds()
        .extend([citizenLng, citizenLat])
        .extend([rescuer.lng, rescuer.lat]);
      map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-emerald-300 shadow-md bg-white mb-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              Live Rescuer Tracking Radar
            </h3>
          </div>

          {currentIncident.denied_by_admin ? (
            <span className="bg-purple-500/30 text-purple-200 border border-purple-400/40 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
              <Zap size={13} className="text-purple-400" /> Admin Denied → Auto-routed to Nearest Rescuer
            </span>
          ) : (
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-400" /> Dispatch Approved by Admin
            </span>
          )}
        </div>

        {rescuer ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10 mt-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-2xl shadow-inner">
                {VEHICLE_EMOJI[rescuer.type] || "🚒"}
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-blue-300 tracking-wider">Assigned Unit</span>
                <h4 className="font-bold text-sm text-white">{rescuer.name}</h4>
                <p className="text-xs text-blue-200">Callsign: <strong>{rescuer.callsign}</strong></p>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-center border-t md:border-t-0 md:border-l border-white/10 pt-2 md:pt-0 md:pl-4">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-300 tracking-wider">Distance & Status</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-extrabold text-amber-400">
                    {isArrived ? "At Scene" : `${distanceKm.toFixed(2)} km`}
                  </span>
                  <span className="text-xs bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded font-medium">
                    {isArrived ? "Arrived" : "En Route"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end border-t md:border-t-0 md:border-l border-white/10 pt-2 md:pt-0 md:pl-4">
              <div>
                <span className="text-[10px] uppercase font-semibold text-emerald-300 tracking-wider">Estimated Arrival</span>
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-lg">
                  <Clock size={18} />
                  <span>{isArrived ? "Arrived Now!" : `~${etaMinutes} mins`}</span>
                </div>
                <p className="text-[11px] text-stone-300 flex items-center gap-1 mt-0.5">
                  <Phone size={11} className="text-emerald-400" /> Leader: {rescuer.phone}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 text-xs text-stone-300 flex items-center gap-2 bg-white/5 rounded-lg">
            <Radio size={16} className="text-amber-400 animate-spin" />
            <span>Finding available rescuers near your location...</span>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[360px] bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full" />

        {!isLoaded && (
          <div className="absolute inset-0 bg-stone-100/90 backdrop-blur-xs flex items-center justify-center text-xs font-semibold text-stone-600 gap-2">
            <Navigation size={18} className="animate-spin text-blue-600" />
            Initializing Live Rescuer Polling Map...
          </div>
        )}

        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md border border-stone-200 text-[11px] text-stone-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Polling Live GPS Updates Every 2.5s</span>
        </div>
      </div>
    </div>
  );
}
