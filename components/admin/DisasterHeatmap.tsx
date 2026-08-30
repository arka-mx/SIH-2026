"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Flame, MapPin, Users, Activity } from "lucide-react";
import { ReportItem } from "@/lib/api";
import { useAdminLocation } from "@/lib/adminLocation";
import {
  buildHeatPoints,
  clusterZones,
  riskTier,
} from "@/lib/disasterHeat";

const DisasterHeatmapMap = dynamic(
  () => import("./DisasterHeatmapMap").then((m) => m.DisasterHeatmapMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[480px] bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">
        Loading heatmap…
      </div>
    ),
  }
);

interface DisasterHeatmapProps {
  incidents: ReportItem[];
}

export function DisasterHeatmap({ incidents }: DisasterHeatmapProps) {
  const { location, ready } = useAdminLocation();
  const [selectedZoneKey, setSelectedZoneKey] = useState<string | null>(null);

  const base = useMemo(
    () =>
      location && location.lat != null && location.lng != null
        ? { lat: location.lat, lng: location.lng, label: location.label }
        : null,
    [location]
  );

  const { points, zones } = useMemo(() => {
    const active = incidents.filter(
      (i) => i.status !== "resolved" && i.status !== "cancelled"
    );
    const pts = buildHeatPoints(active);
    return { points: pts, zones: clusterZones(pts, base) };
  }, [incidents, base]);

  const totalIntensity = zones.reduce((s, z) => s + z.intensity, 0);
  const severeCount = zones.filter((z) => z.intensity >= 4).length;
  const affectedReports = zones.reduce((s, z) => s + z.reports, 0);

  return (
    <div className="adm-card adm-card--plain mb-6 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h3 className="eyebrow flex items-center gap-1.5">
            <Flame size={13} /> Disaster Heatmap
          </h3>
          <p className="text-xs text-slate-600 mt-1 max-w-xl">
            Real-time geographic concentration of active disaster activity around
            your command center. Heat intensity blends disaster type, affected
            population (report volume), casualties and urgency — hotter zones
            need faster resource deployment.
          </p>
        </div>
        <div className="text-right text-[11px] font-mono text-slate-500">
          <span className="block font-bold text-slate-700">
            Base: {location?.label || "Not set"}
          </span>
          {base && (
            <span>
              {base.lat.toFixed(4)}, {base.lng.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      {ready && !base && (
        <div className="border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          Set your operating area from the control at the top of the dashboard to
          center the heatmap on your jurisdiction. Showing a national view until
          then.
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="border border-slate-200 bg-white p-2.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-400 flex items-center gap-1">
            <Activity size={11} /> Heat index
          </span>
          <strong className="text-base text-slate-900">
            {totalIntensity.toFixed(1)}
          </strong>
        </div>
        <div className="border border-slate-200 bg-white p-2.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">
            Hot zones
          </span>
          <strong className="text-base text-slate-900">{zones.length}</strong>
        </div>
        <div className="border border-slate-200 bg-white p-2.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">
            Severe
          </span>
          <strong className="text-base text-rose-700">{severeCount}</strong>
        </div>
        <div className="border border-slate-200 bg-white p-2.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-400 flex items-center gap-1">
            <Users size={11} /> Reports
          </span>
          <strong className="text-base text-slate-900">{affectedReports}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 space-y-2">
          <div className="border border-slate-200 overflow-hidden">
            <DisasterHeatmapMap
              points={points}
              zones={zones}
              base={base}
              selectedZoneKey={selectedZoneKey}
              onSelectZone={(k) =>
                setSelectedZoneKey((prev) => (prev === k ? null : k))
              }
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
            <span className="font-semibold text-slate-600">Intensity</span>
            <span
              className="h-2 flex-1 min-w-[160px] rounded"
              style={{
                background:
                  "linear-gradient(90deg, rgba(103,169,207,0.65), rgb(253,219,120), rgb(244,150,60), rgb(222,80,40), rgb(160,20,20))",
              }}
            />
            <span>Low</span>
            <span className="ml-auto">High</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-blue-700 bg-white" />
              Command center · 10 km ring
            </span>
          </div>
        </div>

        {/* Ranked zones */}
        <div className="lg:col-span-4 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <span className="eyebrow">High-risk zones</span>
            <span className="text-[11px] text-slate-400 font-mono">
              Ranked by heat
            </span>
          </div>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {zones.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 border border-slate-200">
                No active disaster activity to map.
              </div>
            ) : (
              zones.map((z, idx) => {
                const tier = riskTier(z.intensity);
                const selected = selectedZoneKey === z.key;
                return (
                  <button
                    key={z.key}
                    onClick={() =>
                      setSelectedZoneKey((prev) =>
                        prev === z.key ? null : z.key
                      )
                    }
                    className={`w-full text-left p-2.5 border transition-all ${
                      selected
                        ? "border-slate-800 bg-slate-50 ring-1 ring-slate-800"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span className="font-mono text-slate-400">
                          #{idx + 1}
                        </span>
                        <span className="capitalize">{z.types.join(" / ")}</span>
                      </span>
                      <span
                        className={`adm-status adm-status--${tier.tone} text-[10px]`}
                      >
                        {tier.label} · {z.intensity.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                      <span className="flex items-center gap-1 truncate max-w-[150px]">
                        <MapPin size={10} /> {z.label}
                      </span>
                      {z.distanceKm != null && (
                        <span className="font-mono">{z.distanceKm} km</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {z.points.length} incident(s) · {z.reports} report(s)
                      {z.injured ? ` · ${z.injured} injured` : ""}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
