"use client";

import { useState } from "react";
import {
  Eye,
  MapPin,
  Flame,
  Waves,
  Wind,
  Mountain,
  HeartPulse,
  AlertTriangle,
  Radio,
  Clock,
  Shield,
  Layers,
} from "lucide-react";
import { ReportItem, calcDistanceKm } from "@/lib/api";
import { IncidentMap } from "@/components/incidents/IncidentMap";
import { VerificationBadge } from "@/components/incidents/VerificationBadge";

interface ReadOnlyDisasterMapProps {
  incidents: ReportItem[];
  userLat?: number;
  userLng?: number;
  officeName?: string;
}

export function ReadOnlyDisasterMap({
  incidents = [],
  userLat = 0,
  userLng = 0,
  officeName,
}: ReadOnlyDisasterMapProps) {
  const hasBase = Number.isFinite(userLat) && Number.isFinite(userLng) && (userLat !== 0 || userLng !== 0);
  const [selectedId, setSelectedId] = useState<string | null>(
    incidents.length > 0 ? incidents[0].id : null
  );

  function getDisasterIcon(type: string) {
    switch (type?.toLowerCase()) {
      case "flood":
        return <Waves size={16} className="text-blue-600" />;
      case "cyclone":
        return <Wind size={16} className="text-teal-600" />;
      case "fire":
        return <Flame size={16} className="text-orange-600" />;
      case "landslide":
        return <Mountain size={16} className="text-amber-700" />;
      case "medical":
        return <HeartPulse size={16} className="text-rose-600" />;
      default:
        return <AlertTriangle size={16} className="text-amber-600" />;
    }
  }

  // Calculate distance to each incident
  const incidentsWithDistance = incidents.map((inc) => {
    let lat = inc.lat;
    let lng = inc.lng;
    if ((lat === undefined || lng === undefined) && inc.location_wkt) {
      const match = inc.location_wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        lng = parseFloat(match[1]);
        lat = parseFloat(match[2]);
      }
    }
    const distKm =
      hasBase && typeof lat === "number" && typeof lng === "number"
        ? Math.round(calcDistanceKm(userLat, userLng, lat, lng) * 10) / 10
        : null;
    return { ...inc, lat, lng, distKm };
  });

  // Sort by nearest distance (incidents without a fix sink to the bottom)
  incidentsWithDistance.sort((a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity));

  const selectedIncident =
    incidentsWithDistance.find((i) => i.id === selectedId) ||
    incidentsWithDistance[0] ||
    null;

  return (
    <div className="space-y-5">
      {/* Top Banner Notice */}
      <div className="adm-card border-l-[4px] border-l-slate-600 space-y-2">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="adm-status adm-status--blue flex items-center gap-1">
                <Eye size={12} /> Commander Observer Radar
              </span>
              <span className="adm-status adm-status--mute font-mono">
                READ-ONLY SENSOR FEED
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Active Regional Disaster Watch &amp; Citizen SOS Stream
            </h2>
            <p className="text-xs text-slate-600">
              Live spatial map of incoming emergency calls and disaster reports submitted by citizens directly to the District Admin.
              <b> Note:</b> This feed is read-only for tactical awareness. Direct reassignments or modifications are managed via the District Head channel.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-mono font-bold text-slate-700 block">
              Base: {officeName || "Not set"}
            </span>
            {hasBase && (
              <span className="text-[10px] text-slate-400 font-mono">
                {userLat.toFixed(4)}, {userLng.toFixed(4)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Map & Incident Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Map (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <span className="eyebrow flex items-center gap-1.5">
              <Layers size={13} /> Spatial Disaster Mapping
            </span>
            <span className="text-xs font-bold text-slate-500">
              {incidents.length} Active Hotspots
            </span>
          </div>

          <div className="border border-slate-200 overflow-hidden shadow-xs">
            <IncidentMap
              incidents={incidents}
              selectedIncidentId={selectedIncident?.id}
              onSelectIncident={(inc) => setSelectedId(inc.id)}
              isConnected={true}
            />
          </div>

          {/* Selected Incident Read-Only Detail Card */}
          {selectedIncident && (
            <div className="adm-card border-l-[3px] border-l-[#b45309] space-y-3">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 border border-slate-200 bg-slate-50">
                    {getDisasterIcon(selectedIncident.type)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="adm-status adm-status--mute font-mono text-[10px]">
                        {selectedIncident.id}
                      </span>
                      <span className={`adm-status ${
                        selectedIncident.status === "verified"
                          ? "adm-status--green"
                          : selectedIncident.status === "in_progress"
                          ? "adm-status--blue"
                          : "adm-status--amber"
                      }`}>
                        {selectedIncident.status.replace("_", " ")}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 capitalize mt-0.5">
                      {selectedIncident.type} emergency
                      {selectedIncident.address ? ` at ${selectedIncident.address}` : ""}
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  {selectedIncident.distKm !== null && (
                    <span className="text-sm font-mono font-bold text-slate-900 block">
                      {selectedIncident.distKm} km from base
                    </span>
                  )}
                  {typeof selectedIncident.lat === "number" && typeof selectedIncident.lng === "number" && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      {selectedIncident.lat.toFixed(4)}, {selectedIncident.lng.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                <strong>Citizen SOS Description:</strong>{" "}
                {selectedIncident.description || "Emergency rescue request logged by citizen."}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-xs">
                <div className="adm-kv">
                  <span>Reports</span>
                  <strong>{selectedIncident.report_count || 1} logged</strong>
                </div>
                <div className="adm-kv">
                  <span>Cluster</span>
                  <strong className="font-mono">
                    {selectedIncident.cluster_count || selectedIncident.report_count || 1} report(s)
                  </strong>
                </div>
                <div className="adm-kv">
                  <span>Reported</span>
                  <strong className="font-mono text-[11px]">
                    {new Date(selectedIncident.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </strong>
                </div>
                <div className="adm-kv">
                  <span>Mode</span>
                  <strong className="text-slate-500 font-bold">Observed Only</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Nearest Disasters List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <span className="eyebrow">Nearest Reported Hazards</span>
            <span className="text-[11px] text-slate-400 font-mono">Ranked by Distance</span>
          </div>

          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {incidentsWithDistance.length === 0 ? (
              <div className="adm-card text-center py-8 text-xs text-slate-400">
                No active disaster hotspots detected in jurisdiction.
              </div>
            ) : (
              incidentsWithDistance.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;

                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedId(inc.id)}
                    className={`p-3 border cursor-pointer transition-all ${
                      isSelected
                        ? "border-slate-800 bg-slate-50 shadow-xs ring-1 ring-slate-800"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getDisasterIcon(inc.type)}
                        <span className="font-bold text-xs text-slate-900 capitalize">
                          {inc.type} Zone
                        </span>
                        <VerificationBadge verification={inc.verification} size="xs" />
                      </div>
                      {inc.distKm !== null && (
                        <span className="font-mono font-bold text-xs text-slate-800">
                          {inc.distKm} km
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-1.5 leading-snug">
                      {inc.description || "Active emergency incident reported by citizens."}
                    </p>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 truncate max-w-[140px]">
                        <MapPin size={11} /> {inc.address || "Location pending"}
                      </span>
                      <span className="font-mono">
                        {new Date(inc.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
