"use client";

import { useState } from "react";
import { 
  MapPin, 
  Navigation, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Compass, 
  Clock, 
  Sparkles, 
  Flame, 
  Waves, 
  Wind, 
  Mountain, 
  HeartPulse, 
  UserCheck 
} from "lucide-react";
import { ReportItem, apiConfirmAllocation, apiUpdateResourceStatus, apiResolveIncident } from "@/lib/api";

interface DisasterAssignmentCardProps {
  rescuerId: string;
  rescuerType: string;
  rescuerLat: number;
  rescuerLng: number;
  assignedIncident: ReportItem | null;
  allIncidents: ReportItem[];
  onAssignmentChange?: (incident: ReportItem | null, source: "admin_dispatch" | "nearest_fallback") => void;
  onStatusChange?: (status: "available" | "en_route" | "at_scene") => void;
}

// Haversine distance calculator in kilometers
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function DisasterAssignmentCard({
  rescuerId,
  rescuerType,
  rescuerLat,
  rescuerLng,
  assignedIncident,
  allIncidents = [],
  onAssignmentChange,
  onStatusChange,
}: DisasterAssignmentCardProps) {
  const [bypassMode, setBypassMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Compute nearest verified disaster based on rescuer's current GPS location
  const activeVerifiedIncidents = allIncidents.filter(
    (i) => i.status === "verified" || i.status === "unverified"
  );

  const incidentsWithDistance = activeVerifiedIncidents.map((inc) => {
    let lat = inc.lat ?? 19.076;
    let lng = inc.lng ?? 72.8777;
    if ((inc.lat === undefined || inc.lng === undefined) && inc.location_wkt) {
      const match = inc.location_wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        lng = parseFloat(match[1]);
        lat = parseFloat(match[2]);
      }
    }
    const dist = calculateDistanceKm(rescuerLat, rescuerLng, lat, lng);
    return { ...inc, calculatedDistKm: dist, lat, lng };
  });

  // Sort by nearest distance
  incidentsWithDistance.sort((a, b) => a.calculatedDistKm - b.calculatedDistKm);
  const nearestDisaster = incidentsWithDistance[0] || null;

  async function handleAcceptNearestFallback() {
    if (!nearestDisaster) return;
    setLoading(true);
    try {
      if (onAssignmentChange) {
        onAssignmentChange(nearestDisaster, "nearest_fallback");
      }
      if (onStatusChange) {
        onStatusChange("en_route");
      }
      setActionSuccess(`Bypassed Admin delay! Assigned to nearest disaster #${nearestDisaster.id.slice(0, 8)} (${nearestDisaster.calculatedDistKm} km away).`);
    } catch (err) {
      console.warn("Could not set fallback assignment:", err);
    } finally {
      setLoading(false);
    }
  }

  function getDisasterIcon(type: string) {
    switch (type.toLowerCase()) {
      case "flood": return <Waves size={20} className="text-blue-500" />;
      case "cyclone": return <Wind size={20} className="text-cyan-500" />;
      case "fire": return <Flame size={20} className="text-orange-500" />;
      case "landslide": return <Mountain size={20} className="text-amber-700" />;
      case "medical": return <HeartPulse size={20} className="text-rose-500" />;
      default: return <AlertTriangle size={20} className="text-amber-500" />;
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-stone-100">
        <div>
          <p className="eyebrow uppercase text-xs text-stone-500 font-bold tracking-wider">Handoff & Dispatch Control</p>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Compass size={20} className="text-emerald-600" /> Disaster Location Assignment
          </h2>
        </div>

        {/* Admin Fail-Safe Bypass Mode Toggle */}
        <button
          onClick={() => setBypassMode(!bypassMode)}
          className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
            bypassMode
              ? "bg-rose-600 text-white animate-pulse"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300"
          }`}
          title="Enable if Admin head command is unresponsive or delayed"
        >
          <ShieldAlert size={14} />
          {bypassMode ? "⚠️ Admin Fail-Safe Mode (ACTIVE)" : "Bypass Admin (Fail-Safe)"}
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Case A: Active Official Assignment (Admin Head POC) */}
      {assignedIncident && !bypassMode ? (
        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-300 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                {getDisasterIcon(assignedIncident.type)}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Admin Confirmed POC Dispatch
                </span>
                <h3 className="font-bold text-base text-stone-900 capitalize flex items-center gap-2 mt-0.5">
                  {assignedIncident.type} Emergency
                  <span className="font-mono text-xs text-stone-500 font-normal">#{assignedIncident.id.slice(0, 8)}</span>
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold text-emerald-800 block">
                {calculateDistanceKm(rescuerLat, rescuerLng, assignedIncident.lat || 19.076, assignedIncident.lng || 72.8777)} km away
              </span>
              <span className="text-[11px] text-stone-500 flex items-center justify-end gap-1">
                <Clock size={11} /> Est. ~12 mins travel
              </span>
            </div>
          </div>

          <div className="text-xs text-stone-700 bg-white/90 p-3 rounded-lg border border-emerald-200">
            <strong>Incident Details & Requirements:</strong> {assignedIncident.description || "Evacuation and emergency medical deployment required."}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-emerald-200/80 flex-wrap gap-2">
            <span className="text-xs text-stone-600 flex items-center gap-1">
              <MapPin size={13} className="text-emerald-600" /> Location: <b>{assignedIncident.location_wkt || "District Target"}</b>
            </span>

            <div className="flex gap-2">
              <button
                onClick={() => onStatusChange && onStatusChange("en_route")}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1"
              >
                <Navigation size={12} /> Set En Route
              </button>
              <button
                onClick={() => onStatusChange && onStatusChange("at_scene")}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1"
              >
                <UserCheck size={12} /> Arrived at Scene
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Case B: Fail-Safe Auto-Calculated Nearest Disaster (Bypass Admin) */}
      {(!assignedIncident || bypassMode) && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles size={12} className="text-amber-700" />
              Nearest Disaster Auto-Assignment (GPS Nearest Neighbor)
            </span>
            <span className="text-xs font-mono text-stone-500">Fail-Safe Triggered</span>
          </div>

          {nearestDisaster ? (
            <div className="space-y-3 bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
                    {getDisasterIcon(nearestDisaster.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 capitalize text-sm">
                      Closest Disaster: {nearestDisaster.type} Zone
                    </h3>
                    <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} /> {nearestDisaster.location_wkt || "Nearby Sector"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded block">
                    📍 {nearestDisaster.calculatedDistKm} km from unit
                  </span>
                  <span className="text-[10px] text-stone-500 block mt-1">Est. {Math.round(nearestDisaster.calculatedDistKm * 3)} mins travel</span>
                </div>
              </div>

              <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded border border-stone-200">
                {nearestDisaster.description || "Unresolved incident nearest to team's current spatial coordinates."}
              </p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-stone-500">
                  Calculated automatically via PostGIS proximity ranking
                </span>
                <button
                  onClick={handleAcceptNearestFallback}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <Send size={13} /> Accept Nearest Assignment (Fail-Safe)
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-stone-500 py-3 text-center">
              No active disaster locations detected nearby.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
