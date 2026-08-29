"use client";

import dynamic from "next/dynamic";
import { Navigation, Radio } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ReportItem, ResourceItem } from "@/lib/api";
import { RadicalRegionRule } from "@/types/rescuer";

const DynamicLiveMap = dynamic(
  () => import("./LiveMap").then((mod) => mod.LiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[420px] bg-stone-100 flex flex-col items-center justify-center text-stone-500 rounded-xl">
        <Radio className="animate-spin text-emerald-600 mb-2" size={24} />
        <span className="text-xs font-semibold">Initializing GeoSpatial Command Map...</span>
      </div>
    ),
  }
);

interface IncidentMapProps {
  incidents?: ReportItem[];
  resources?: ResourceItem[];
  radicalRegions?: RadicalRegionRule[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: ReportItem) => void;
  isConnected?: boolean;
}

export function IncidentMap({
  incidents = [],
  resources = [],
  radicalRegions = [],
  selectedIncidentId,
  onSelectIncident,
  isConnected = true,
}: IncidentMapProps) {
  return (
    <Card className="map-panel !p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="eyebrow">District Situation Overview</p>
          <h2 className="section-title">Live Response & Geo-Clustering Map</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`live-pill ${isConnected ? "!bg-emerald-100 !text-emerald-800" : "!bg-amber-100 !text-amber-800"}`}>
            <i className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-600 animate-ping" : "bg-amber-600"}`} />
            {isConnected ? "Live Socket Feed" : "Connecting..."}
          </span>
        </div>
      </div>

      <DynamicLiveMap
        incidents={incidents}
        resources={resources}
        radicalRegions={radicalRegions}
        selectedIncidentId={selectedIncidentId}
        onSelectIncident={onSelectIncident}
      />

      <div className="mt-3 flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100 flex-wrap gap-2">
        <div className="flex items-center gap-3 text-[11px] flex-wrap">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Unverified Report
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Auto-Verified (3+ cluster)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Active Dispatch
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-md bg-indigo-600" /> Rescue Team / Resource Giver
          </span>
          <span className="flex items-center gap-1.5 font-medium text-rose-700">
            <span className="w-2.5 h-2.5 rounded-full border border-rose-500 bg-rose-100" /> High-Risk Danger Zone
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px] text-stone-400">
          <Navigation size={12} /> OpenFreeMap Vector Engine (Free & Keyless)
        </div>
      </div>
    </Card>
  );
}

