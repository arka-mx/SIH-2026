"use client";

import { useEffect, useState } from "react";
import {
  apiAssignTaskToTeamHead,
  apiGetAllRegisteredTeamHeads,
  ReportItem,
  TeamHeadContactRecord,
} from "@/lib/api";
import {
  Crown,
  Phone,
  Building,
  MapPin,
  Send,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Target,
} from "lucide-react";

interface RegisteredTeamHeadsManagerProps {
  incidents: ReportItem[];
  selectedIncident?: ReportItem | null;
  onRefreshData?: () => void;
}

export function RegisteredTeamHeadsManager({
  incidents,
  selectedIncident,
  onRefreshData,
}: RegisteredTeamHeadsManagerProps) {
  const [teamHeads, setTeamHeads] = useState<TeamHeadContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningUnit, setAssigningUnit] = useState<string | null>(null);
  const [selectedIncidentPerHead, setSelectedIncidentPerHead] = useState<Record<string, string>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  async function loadTeamHeads() {
    try {
      setLoading(true);
      const heads = await apiGetAllRegisteredTeamHeads();
      setTeamHeads(heads);
    } catch (err) {
      console.warn("Could not load registered team heads:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeamHeads();
    const interval = setInterval(loadTeamHeads, 5000);
    return () => clearInterval(interval);
  }, []);

  function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  function getIncidentCoords(inc: ReportItem): { lat: number; lng: number } | null {
    if (typeof inc.lat === "number" && typeof inc.lng === "number") {
      return { lat: inc.lat, lng: inc.lng };
    }
    if (inc.location_wkt) {
      const m = inc.location_wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (m) {
        return { lat: parseFloat(m[2]), lng: parseFloat(m[1]) };
      }
    }
    return null;
  }

  // Active unassigned/verified/in-progress incidents
  const activeIncidents = incidents.filter(
    (i) => i.status === "verified" || i.status === "in_progress" || i.status === "unverified"
  );

  const selectedCoords = selectedIncident ? getIncidentCoords(selectedIncident) : null;

  // Sort Rescue Team Heads in ASCENDING order of their distance from the selected report
  const sortedTeamHeads = [...teamHeads]
    .map((head) => {
      let distToSelected: number | null = null;
      if (
        selectedCoords &&
        typeof head.officeLat === "number" &&
        typeof head.officeLng === "number"
      ) {
        distToSelected = getDistanceKm(
          head.officeLat,
          head.officeLng,
          selectedCoords.lat,
          selectedCoords.lng
        );
      }
      return { ...head, distToSelected };
    })
    .sort((a, b) => {
      if (a.distToSelected !== null && b.distToSelected !== null) {
        return a.distToSelected - b.distToSelected;
      }
      return 0;
    });

  async function handleAssign(teamId: string) {
    const incidentId = selectedIncidentPerHead[teamId];
    if (!incidentId) return;

    setAssigningUnit(teamId);
    try {
      const res = await apiAssignTaskToTeamHead(teamId, incidentId);
      setToastMsg(res.message);
      await loadTeamHeads();
      onRefreshData?.();
      setTimeout(() => setToastMsg(null), 5000);
    } catch (err) {
      console.error("Assignment error:", err);
      setToastMsg("Could not assign task to rescue team head.");
      setTimeout(() => setToastMsg(null), 5000);
    } finally {
      setAssigningUnit(null);
    }
  }

  return (
    <div className="adm-card space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200">
        <div>
          <span className="eyebrow flex items-center gap-1.5">
            <Radio size={14} className="text-[#115e59]" /> Regional Command &amp; Dispatch
          </span>
          <h2 className="section-title mt-0.5">
            Registered Rescue Team Heads &amp; Proximity Task Assignment
          </h2>
        </div>
        <span className="adm-status adm-status--blue font-mono text-xs">
          {teamHeads.length} Registered Team Heads
        </span>
      </div>

      {/* Selected Report Banner */}
      {selectedIncident && (
        <div className="p-3 bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold">
            <Target size={16} className="text-[#115e59]" />
            <span>
              Sorted by ascending distance to selected report:{" "}
              <strong className="underline font-mono">#{selectedIncident.id}</strong> ({selectedIncident.type.toUpperCase()})
            </span>
          </div>
          <span className="text-[11px] text-teal-700 font-mono font-medium">
            Closest Rescue Team Head listed first ⬇
          </span>
        </div>
      )}

      {toastMsg && (
        <div className="adm-note flex items-center gap-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border-emerald-300">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {loading && teamHeads.length === 0 ? (
        <div className="text-xs text-slate-400 text-center py-8">
          Loading registered rescue team heads...
        </div>
      ) : teamHeads.length === 0 ? (
        <div className="text-xs text-slate-500 text-center py-8">
          No registered rescue team heads found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedTeamHeads.map((head) => {
            // Sort active incidents by proximity to this Team Head's office
            const incidentsWithDist = activeIncidents
              .map((inc) => {
                const coords = getIncidentCoords(inc);
                const dist =
                  coords &&
                  typeof head.officeLat === "number" &&
                  typeof head.officeLng === "number"
                    ? getDistanceKm(head.officeLat, head.officeLng, coords.lat, coords.lng)
                    : 999;
                return { ...inc, dist };
              })
              .sort((a, b) => a.dist - b.dist);

            const closestInc = incidentsWithDist[0];
            const currentSelected =
              selectedIncidentPerHead[head.teamId] ||
              (selectedIncident ? selectedIncident.id : closestInc ? closestInc.id : "");

            return (
              <div
                key={head.teamId}
                className="p-4 border border-slate-200 bg-white space-y-3 shadow-xs hover:border-[#115e59]/40 transition-colors"
              >
                {/* Team Head Header */}
                <div className="flex items-start justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <Crown size={15} className="text-amber-600" />
                        {head.headName}
                      </span>
                      <span className="adm-status adm-status--mute font-mono text-[10px]">
                        {head.teamId}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                      <Building size={13} className="text-[#115e59] shrink-0" />
                      <span className="font-semibold">{head.headOffice}</span>
                    </p>
                  </div>

                  <span
                    className={`adm-status text-[10px] ${
                      head.status === "assigned"
                        ? "adm-status--amber"
                        : head.status === "en_route"
                        ? "adm-status--blue"
                        : "adm-status--green"
                    }`}
                  >
                    {head.status === "assigned"
                      ? "Assigned Task"
                      : head.status === "en_route"
                      ? "En Route"
                      : "Available"}
                  </span>
                </div>

                {/* Distance to Selected Report Badge */}
                {selectedIncident && head.distToSelected !== null && (
                  <div className="bg-teal-50 border border-teal-200 p-2 text-xs text-teal-900 flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Target size={13} className="text-[#115e59]" /> Distance to Report #{selectedIncident.id}:
                    </span>
                    <span className="font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded text-xs">
                      {head.distToSelected} km
                    </span>
                  </div>
                )}

                {/* Contact Phone & Base Coordinates */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-slate-50 p-2 border border-slate-200 space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-medium block flex items-center gap-1">
                      <Phone size={11} className="text-emerald-600" /> Direct Phone Number
                    </span>
                    <a
                      href={`tel:${head.headPhone}`}
                      className="font-mono font-bold text-emerald-700 hover:underline text-xs"
                    >
                      {head.headPhone}
                    </a>
                  </div>

                  <div className="bg-slate-50 p-2 border border-slate-200 space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-medium block flex items-center gap-1">
                      <MapPin size={11} className="text-blue-600" /> Base GPS Location
                    </span>
                    <span className="font-mono text-[11px] text-slate-800 font-semibold">
                      {typeof head.officeLat === "number" && typeof head.officeLng === "number"
                        ? `${head.officeLat.toFixed(3)}, ${head.officeLng.toFixed(3)}`
                        : "GPS set"}
                    </span>
                  </div>
                </div>

                {/* Assigned Task Info if already assigned */}
                {head.assignedIncidentTitle && (
                  <div className="p-2 bg-amber-50 border border-amber-200 text-xs text-amber-900 rounded-none flex items-start gap-1.5">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[11px]">Currently Assigned:</span>
                      <span className="block text-[11px] truncate font-medium">
                        {head.assignedIncidentTitle}
                      </span>
                    </div>
                  </div>
                )}

                {/* Closest Task Assignment Box */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                      <Navigation size={12} className="text-[#115e59]" /> Assign Regional Task (By Proximity)
                    </span>
                    {closestInc && closestInc.dist !== 999 && (
                      <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                        Closest: {closestInc.dist} km
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={currentSelected}
                      onChange={(e) =>
                        setSelectedIncidentPerHead((prev) => ({
                          ...prev,
                          [head.teamId]: e.target.value,
                        }))
                      }
                      className="flex-1 p-2 bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:border-[#c2410c] focus:outline-hidden"
                    >
                      {incidentsWithDist.length === 0 ? (
                        <option value="">No active incidents</option>
                      ) : (
                        incidentsWithDist.map((inc) => (
                          <option key={inc.id} value={inc.id}>
                            {inc.dist !== 999 ? `[${inc.dist} km] ` : ""}
                            {inc.type.toUpperCase()} - {inc.description ? inc.description.slice(0, 35) : inc.id}
                          </option>
                        ))
                      )}
                    </select>

                    <button
                      type="button"
                      disabled={!currentSelected || assigningUnit === head.teamId}
                      onClick={() => handleAssign(head.teamId)}
                      className="adm-btn adm-btn--primary text-xs py-2 px-3 shrink-0 flex items-center gap-1.5"
                    >
                      <Send size={12} />
                      {assigningUnit === head.teamId ? "Assigning..." : "Assign Task"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
