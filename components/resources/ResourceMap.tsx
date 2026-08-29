"use client";

import dynamic from "next/dynamic";
import { Radio, Navigation } from "lucide-react";
import { ResourceItem } from "@/lib/api";

const DynamicLiveMap = dynamic(
  () => import("../incidents/LiveMap").then((mod) => mod.LiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[360px] bg-stone-100 flex flex-col items-center justify-center text-stone-500 rounded-xl">
        <Radio className="animate-spin text-emerald-600 mb-2" size={24} />
        <span className="text-xs font-semibold">Loading MapTiler Resource Deployments...</span>
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
        <div>
          <p className="eyebrow">Operational Deployment</p>
          <h2 className="section-title">Live Resource Depot Map (MapTiler)</h2>
        </div>
        <span className="live-pill !bg-indigo-100 !text-indigo-800">
          <i className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" /> Live Tracking
        </span>
      </div>

      <DynamicLiveMap incidents={[]} resources={resources} />

      <div className="resource-map-legend mt-3 pt-2 border-t border-stone-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-4 text-[11px]">
          <span><i className="legend-dot available" /> Available in Depot</span>
          <span><i className="legend-dot moving" /> En Route</span>
          <span><i className="legend-dot scene" /> At Scene</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px] text-stone-400">
          <Navigation size={12} /> MapTiler Cloud Tiles
        </div>
      </div>
    </section>
  );
}