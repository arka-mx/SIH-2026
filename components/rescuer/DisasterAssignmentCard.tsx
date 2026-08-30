"use client";

import { useState } from "react";
import {
  MapPin,
  Navigation,
  Send,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Flame,
  Waves,
  Wind,
  Mountain,
  HeartPulse,
  UserCheck,
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
      case "flood": return <Waves size={18} />;
      case "cyclone": return <Wind size={18} />;
      case "fire": return <Flame size={18} />;
      case "landslide": return <Mountain size={18} />;
      case "medical": return <HeartPulse size={18} />;
      default: return <AlertTriangle size={18} />;
    }
  }

  return (
    <div className="adm-card space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-2 pb-4 border-b border-slate-200">
        <div>
          <span className="eyebrow">Handoff &amp; dispatch control</span>
          <h2 className="section-title mt-1">Disaster location assignment</h2>
        </div>

        <button
          onClick={() => setBypassMode(!bypassMode)}
          className={`adm-btn ${bypassMode ? "adm-btn--danger" : ""}`}
          title="Enable if admin command is unresponsive or delayed"
        >
          <ShieldAlert size={14} />
          {bypassMode ? "Fail-safe mode active" : "Bypass admin (fail-safe)"}
        </button>
      </div>

      {actionSuccess && (
        <div className="adm-note">
          <CheckCircle2 size={15} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Case A: active official assignment */}
      {assignedIncident && !bypassMode ? (
        <div className="border border-slate-200 border-l-[3px] border-l-[color:var(--a-accent)] p-4 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="border border-slate-200 p-2.5 text-slate-600">
                {getDisasterIcon(assignedIncident.type)}
              </span>
              <div>
                <span className="adm-status adm-status--green">Admin-confirmed dispatch</span>
                <h3 className="font-bold text-base text-slate-900 capitalize flex items-center gap-2 mt-1">
                  {assignedIncident.type} emergency
                  <span className="font-mono text-xs text-slate-500 font-normal">#{assignedIncident.id.slice(0, 8)}</span>
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-sm font-mono font-bold text-slate-900 block">
                {calculateDistanceKm(rescuerLat, rescuerLng, assignedIncident.lat || 19.076, assignedIncident.lng || 72.8777)} km away
              </span>
              <span className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                <Clock size={11} /> Est. ~12 min travel
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 p-3">
            <strong>Incident details &amp; requirements:</strong>{" "}
            {assignedIncident.description || "Evacuation and emergency medical deployment required."}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 flex-wrap gap-2">
            <span className="text-xs text-slate-600 flex items-center gap-1">
              <MapPin size={13} /> Location: <b className="text-slate-900">{assignedIncident.location_wkt || "District target"}</b>
            </span>

            <div className="flex gap-2">
              <button onClick={() => onStatusChange && onStatusChange("en_route")} className="adm-btn adm-btn--primary">
                <Navigation size={12} /> Set en route
              </button>
              <button onClick={() => onStatusChange && onStatusChange("at_scene")} className="adm-btn">
                <UserCheck size={12} /> Arrived at scene
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Case B: fail-safe nearest disaster */}
      {(!assignedIncident || bypassMode) && (
        <div className="border border-slate-200 border-l-[3px] border-l-amber-500 p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="eyebrow">Nearest-disaster auto-assignment</span>
            <span className="text-xs font-mono text-slate-400">Fail-safe</span>
          </div>

          {nearestDisaster ? (
            <div className="space-y-3 border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="border border-slate-200 p-2 text-slate-600">
                    {getDisasterIcon(nearestDisaster.type)}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 capitalize text-sm">
                      Closest disaster: {nearestDisaster.type} zone
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} /> {nearestDisaster.location_wkt || "Nearby sector"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-slate-900 block">
                    {nearestDisaster.calculatedDistKm} km from unit
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Est. {Math.round(nearestDisaster.calculatedDistKm * 3)} min travel
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 p-2.5">
                {nearestDisaster.description || "Unresolved incident nearest to the team's current coordinates."}
              </p>

              <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                <span className="text-[11px] text-slate-500">Ranked automatically by GPS proximity</span>
                <button
                  onClick={handleAcceptNearestFallback}
                  disabled={loading}
                  className="adm-btn adm-btn--primary"
                >
                  <Send size={13} /> Accept nearest assignment
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-3 text-center">
              No active disaster locations detected nearby.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
