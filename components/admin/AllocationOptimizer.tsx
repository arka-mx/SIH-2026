"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Boxes,
  Route,
  Home,
  Truck,
  ArrowRight,
  Check,
  AlertTriangle,
} from "lucide-react";
import {
  ReportItem,
  ResourceItem,
  AllocationLine,
  apiConfirmAllocation,
  calcDistanceKm,
} from "@/lib/api";
import { useAdminLocation } from "@/lib/adminLocation";
import {
  optimizeAllocations,
  AllocationRecommendation,
} from "@/lib/allocationOptimizer";

const AllocationOptimizerMap = dynamic(
  () =>
    import("./AllocationOptimizerMap").then((m) => m.AllocationOptimizerMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[480px] bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">
        Loading map…
      </div>
    ),
  }
);

interface AllocationOptimizerProps {
  incidents: ReportItem[];
  resources: ResourceItem[];
  allocations?: AllocationLine[];
  onDispatched?: () => void;
}

/** Nearest active incident to a zone centroid — the target for a dispatch. */
function incidentForZone(
  incidents: ReportItem[],
  zoneLat: number,
  zoneLng: number
): ReportItem | null {
  let best: ReportItem | null = null;
  let bestDist = Infinity;
  for (const inc of incidents) {
    if (inc.status === "resolved" || inc.status === "cancelled") continue;
    const lat = inc.lat;
    const lng = inc.lng;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    const d = calcDistanceKm(zoneLat, zoneLng, lat, lng);
    if (d < bestDist && d <= 3) {
      bestDist = d;
      best = inc;
    }
  }
  return best;
}

const accessTone: Record<string, string> = {
  clear: "adm-status--green",
  passable: "adm-status--blue",
  constrained: "adm-status--amber",
  cut_off: "adm-status--red",
};

export function AllocationOptimizer({
  incidents,
  resources,
  allocations = [],
  onDispatched,
}: AllocationOptimizerProps) {
  const { location, ready } = useAdminLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const dispatchedResourceIds = useMemo(
    () =>
      new Set(
        allocations
          .filter((a) => a.status === "en_route" || a.status === "at_scene")
          .map((a) => a.resource_id)
      ),
    [allocations]
  );

  const base = useMemo(
    () =>
      location && location.lat != null && location.lng != null
        ? { lat: location.lat, lng: location.lng, label: location.label }
        : null,
    [location]
  );

  const { recommendations, unserved, summary } = useMemo(
    () => optimizeAllocations({ incidents, resources, base }),
    [incidents, resources, base]
  );

  const coverage = summary.peopleAffected
    ? Math.round((summary.peopleCovered / summary.peopleAffected) * 100)
    : 0;

  async function handleDispatch(rec: AllocationRecommendation) {
    const target = incidentForZone(incidents, rec.zoneLat, rec.zoneLng);
    if (!target) {
      setDispatchError(
        `No open incident within 3 km of the "${rec.zoneLabel}" zone to dispatch against.`
      );
      return;
    }
    setDispatchingId(rec.id);
    setDispatchError(null);
    try {
      await apiConfirmAllocation(target.id, rec.resourceId);
      onDispatched?.();
    } catch (err) {
      setDispatchError(
        err instanceof Error ? err.message : "Failed to confirm dispatch"
      );
    } finally {
      setDispatchingId(null);
    }
  }

  return (
    <div className="adm-card adm-card--plain mb-6 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h3 className="eyebrow flex items-center gap-1.5">
            <Boxes size={13} /> Resource &amp; Shelter Allocation Optimizer
          </h3>
          <p className="text-xs text-slate-600 mt-1 max-w-xl">
            Automatically matches available shelters and resources to affected
            zones by distance, route accessibility, capacity, severity and
            demand. Critical zones are matched first; every recommendation shows
            the resource, its destination, why it was chosen and the capacity
            left afterwards.
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
          Set your operating area from the control at the top of the dashboard so
          the optimizer can measure routes from your command center. Showing a
          national view until then.
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="border border-slate-200 bg-white p-2.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">
            Affected zones
          </span>
          <strong className="block text-base text-slate-900">
            {summary.zones}
          </strong>
        </div>
        <div className="border border-slate-200 bg-white p-2.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">
            Recommendations
          </span>
          <strong className="block text-base text-slate-900">
            {summary.matched}
          </strong>
        </div>
        <div className="border border-slate-200 bg-white p-2.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">
            People covered
          </span>
          <strong className="block text-base text-slate-900">
            {summary.peopleCovered}/{summary.peopleAffected}{" "}
            <span className="text-[11px] font-normal text-slate-400">
              ({coverage}%)
            </span>
          </strong>
        </div>
        <div className="border border-slate-200 bg-white p-2.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">
            Unserved zones
          </span>
          <strong
            className={`block text-base ${
              unserved.length ? "text-rose-700" : "text-slate-900"
            }`}
          >
            {unserved.length}
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7 space-y-2">
          <div className="border border-slate-200 overflow-hidden">
            <AllocationOptimizerMap
              recommendations={recommendations}
              base={base}
              selectedId={selectedId}
              onSelect={(id) =>
                setSelectedId((prev) => (prev === id ? null : id))
              }
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-teal-700" /> Shelter
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" /> Resource
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-600 text-white text-[8px] flex items-center justify-center">
                #
              </span>
              Affected zone (priority rank)
            </span>
            <span className="ml-auto">Line colour = zone severity</span>
          </div>
        </div>

        {/* Recommendation list */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <span className="eyebrow">Recommended allocations</span>
            <span className="text-[11px] text-slate-400 font-mono">
              Critical first
            </span>
          </div>

          {dispatchError && (
            <div className="border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
              {dispatchError}
            </div>
          )}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {recommendations.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 border border-slate-200">
                No active zones needing allocation.
              </div>
            ) : (
              recommendations.map((r) => (
                <RecommendationRow
                  key={r.id}
                  rec={r}
                  selected={selectedId === r.id}
                  dispatched={dispatchedResourceIds.has(r.resourceId)}
                  dispatching={dispatchingId === r.id}
                  onSelect={() =>
                    setSelectedId((prev) => (prev === r.id ? null : r.id))
                  }
                  onDispatch={() => handleDispatch(r)}
                />
              ))
            )}

            {unserved.map((u) => (
              <div
                key={u.zoneKey}
                className="p-2.5 border border-rose-200 bg-rose-50 text-[11px] text-rose-800"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <AlertTriangle size={12} /> Zone #{u.priorityRank} unserved (
                  {u.need})
                </div>
                <div className="mt-1 capitalize">
                  {u.zoneTypes.join(" / ")} · ~{u.peopleAffected} people ·{" "}
                  {u.zoneLabel}
                </div>
                <div className="mt-1 text-rose-700">{u.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecommendationRow({
  rec,
  selected,
  dispatched,
  dispatching,
  onSelect,
  onDispatch,
}: {
  rec: AllocationRecommendation;
  selected: boolean;
  dispatched: boolean;
  dispatching: boolean;
  onSelect: () => void;
  onDispatch: () => void;
}) {
  const Icon = rec.kind === "shelter" ? Home : Truck;
  return (
    <div
      className={`border transition-all ${
        selected
          ? "border-slate-800 bg-slate-50 ring-1 ring-slate-800"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <button onClick={onSelect} className="w-full text-left p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
            <span className="font-mono text-slate-400">#{rec.priorityRank}</span>
            <Icon size={12} />
            <span className="capitalize">{rec.zoneTypes.join(" / ")} zone</span>
          </span>
          <span
            className={`adm-status adm-status--${rec.severity.tone} text-[10px]`}
          >
            {rec.severity.label}
          </span>
        </div>

        <div className="mt-1.5 text-[11px] text-slate-700 flex items-center gap-1">
          <span className="font-semibold">{rec.resourceName}</span>
          <ArrowRight size={11} className="text-slate-400" />
          <span className="truncate">{rec.zoneLabel}</span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
          <span
            className={`adm-status ${
              accessTone[rec.route.access] || "adm-status--blue"
            } text-[10px]`}
          >
            <Route size={9} /> {rec.route.label} · ~{rec.route.etaMin} min
          </span>
          <span className="font-mono text-slate-500">
            {rec.route.drivableKm} km
          </span>
          <span
            className={`font-mono ${
              rec.fullyCovered ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {rec.allocatedAmount}/{rec.demandAmount} {rec.unit}
          </span>
        </div>

        <div className="mt-1.5 text-[10px] text-slate-500 leading-relaxed">
          {rec.reason}
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>
            Capacity left: {rec.remainingCapacityAfter}
            {rec.capacityTotal ? ` / ${rec.capacityTotal}` : ""}
          </span>
        </div>
      </button>

      <div className="border-t border-slate-100 px-2.5 py-1.5">
        {dispatched ? (
          <span className="text-[10px] font-semibold flex items-center gap-1 text-emerald-700">
            <Check size={11} /> Dispatched · {rec.resourceName} en route
          </span>
        ) : (
          <button
            onClick={onDispatch}
            disabled={dispatching}
            className="text-[10px] font-semibold flex items-center gap-1 text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            <Check size={11} /> {dispatching ? "Confirming…" : "Confirm & dispatch"}
          </button>
        )}
      </div>
    </div>
  );
}
