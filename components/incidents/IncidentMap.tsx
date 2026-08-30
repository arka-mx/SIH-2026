"use client";

import dynamic from "next/dynamic";
import { Radio } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ReportItem, ResourceItem } from "@/lib/api";
import { RadicalRegionRule, RescuerUnitProfile } from "@/types/rescuer";

const DynamicLiveMap = dynamic(
  () => import("./LiveMap").then((mod) => mod.LiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[420px] bg-slate-100 flex flex-col items-center justify-center text-slate-500">
        <Radio className="animate-spin mb-2" size={22} />
        <span className="text-xs font-semibold">Loading map…</span>
      </div>
    ),
  }
);

interface IncidentMapProps {
  incidents?: ReportItem[];
  resources?: ResourceItem[];
  rescuers?: RescuerUnitProfile[];
  radicalRegions?: RadicalRegionRule[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: ReportItem) => void;
  isConnected?: boolean;
}

export function IncidentMap({
  incidents = [],
  resources = [],
  rescuers = [],
  radicalRegions = [],
  selectedIncidentId,
  onSelectIncident,
  isConnected = true,
}: IncidentMapProps) {
  return (
    <Card className="map-panel !p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title">Map</h2>
        <span className="live-pill">
          <i style={{ background: isConnected ? "#15803d" : "#b45309" }} />
          {isConnected ? "Live" : "Connecting…"}
        </span>
      </div>

      <DynamicLiveMap
        incidents={incidents}
        resources={resources}
        rescuers={rescuers}
        radicalRegions={radicalRegions}
        selectedIncidentId={selectedIncidentId}
        onSelectIncident={onSelectIncident}
      />

      <div className="mt-3 flex items-center text-xs text-slate-500 pt-2 border-t border-slate-200 flex-wrap gap-x-4 gap-y-1.5">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-amber-500" /> Unverified
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-emerald-600" /> Verified
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-blue-600" /> Dispatched
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-indigo-600" /> Team
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 border-2 border-emerald-600 bg-white" /> Rescuer GPS
        </span>
        <span className="flex items-center gap-1.5 text-rose-700">
          <span className="w-2.5 h-2.5 border border-rose-500 bg-rose-100" /> High-risk zone
        </span>
      </div>
    </Card>
  );
}

