"use client";

import { useState } from "react";
import { MapPin, PackageCheck, Send, RotateCw, CheckCircle2, AlertCircle } from "lucide-react";
import { ResourceItem, apiUpdateResourceStatus } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";

export function ResourceCard({
  resource,
  onUpdate,
}: {
  resource: ResourceItem;
  onUpdate?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCap = resource.capacity_total - resource.capacity_used;
  const usage = Math.round((resource.capacity_used / (resource.capacity_total || 1)) * 100);

  const tone: "green" | "red" | "amber" | "neutral" =
    resource.status === "available" ? "green" : resource.status === "at_scene" ? "amber" : "neutral";

  async function handleStatusChange(nextStatus: "en_route" | "at_scene" | "available") {
    setLoading(true);
    setError(null);
    try {
      await apiUpdateResourceStatus(resource.id, nextStatus);
      if (onUpdate) onUpdate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="resource-card !p-4 bg-white rounded-xl border border-stone-200 shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex rounded-xl bg-[#edf2e7] p-2 text-[#397254]">
            <PackageCheck size={18} />
          </div>
          <p className="eyebrow uppercase text-[10px] text-stone-500 font-bold">{resource.type}</p>
          <h3 className="font-bold text-stone-900 text-sm">{resource.name}</h3>
        </div>
        <Badge tone={tone}>
          {resource.status}
        </Badge>
      </div>

      <p className="mt-2 flex items-center gap-1 text-xs text-stone-500">
        <MapPin size={13} />
        {resource.location_wkt || "Geo-Indexed Base"}
      </p>

      <div className="resource-capacity mt-3">
        <div className="flex items-end justify-between text-xs mb-1">
          <span>
            <strong>{resource.capacity_used.toLocaleString()}</strong> deployed of{" "}
            {resource.capacity_total.toLocaleString()} units
          </span>
          <b className="font-mono text-stone-700">{usage}%</b>
        </div>
        <div className="capacity-track w-full bg-stone-100 h-2 rounded-full overflow-hidden">
          <span
            className={`block h-full transition-all ${
              usage > 80 ? "bg-rose-500" : usage > 50 ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, usage)}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mt-2 text-[11px] text-red-600 bg-red-50 p-1.5 rounded flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {/* Manual Lifecycle Control for Demo */}
      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[10px] text-stone-400">
          {(resource.disaster_types || []).join(" · ")}
        </div>

        <div className="flex gap-1.5">
          {resource.status === "available" && (
            <button
              onClick={() => handleStatusChange("en_route")}
              disabled={loading}
              className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-md font-semibold flex items-center gap-1"
            >
              Set En Route
            </button>
          )}

          {resource.status === "en_route" && (
            <button
              onClick={() => handleStatusChange("at_scene")}
              disabled={loading}
              className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 rounded-md font-semibold flex items-center gap-1"
            >
              Set At Scene
            </button>
          )}

          {resource.status === "at_scene" && (
            <button
              onClick={() => handleStatusChange("available")}
              disabled={loading}
              className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-md font-semibold flex items-center gap-1"
            >
              Return to Base
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
