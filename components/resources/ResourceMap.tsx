"use client";

import dynamic from "next/dynamic";
import { Radio } from "lucide-react";
import { ResourceItem } from "@/lib/api";

const DynamicLiveMap = dynamic(
  () => import("../incidents/LiveMap").then((mod) => mod.LiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[360px] bg-slate-100 flex flex-col items-center justify-center text-slate-500">
        <Radio className="animate-spin mb-2" size={22} />
        <span className="text-xs font-semibold">Loading map…</span>
      </div>
    ),
  }
);

interface ResourceMapProps {
  resources?: ResourceItem[];
}

export function ResourceMap({ resources = [] }: ResourceMapProps) {
  return (
    <section className="clay-panel resource-map-panel !p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title">Depot map</h2>
        <span className="live-pill">
          <i /> Live
        </span>
      </div>

      <DynamicLiveMap incidents={[]} resources={resources} />

      <div className="resource-map-legend mt-3 pt-2 border-t border-slate-200 flex items-center flex-wrap gap-x-4 gap-y-1.5 text-[11px]">
        <span><i className="legend-dot available" /> Available</span>
        <span><i className="legend-dot moving" /> En route</span>
        <span><i className="legend-dot scene" /> At scene</span>
      </div>
    </section>
  );
}
