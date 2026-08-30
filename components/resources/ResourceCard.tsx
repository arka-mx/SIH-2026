"use client";

import { useState } from "react";
import { MapPin, PackageCheck, AlertCircle } from "lucide-react";
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
    <article className="resource-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex border border-slate-200 p-2 text-slate-600">
            <PackageCheck size={18} />
          </div>
          <p className="eyebrow">{resource.type}</p>
          <h3 className="font-bold text-slate-900 text-sm">{resource.name}</h3>
        </div>
        <Badge tone={tone}>{resource.status.replace("_", " ")}</Badge>
      </div>

      <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
        <MapPin size={13} />
        {resource.location_wkt || "Base"}
      </p>

      <div className="resource-capacity mt-3">
        <div className="flex items-end justify-between text-xs mb-1">
          <span>
            <strong>{resource.capacity_used.toLocaleString()}</strong> / {resource.capacity_total.toLocaleString()}
          </span>
          <b className="font-mono text-slate-700">{usage}%</b>
        </div>
        <div className="capacity-track w-full">
          <span
            className="block h-full transition-all"
            style={{ width: `${Math.min(100, usage)}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mt-2 text-[11px] text-red-700 border border-red-300 p-1.5 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[10px] text-slate-400">
          {(resource.disaster_types || []).join(" · ")}
        </div>

        <div className="flex gap-1.5">
          {resource.status === "available" && (
            <button onClick={() => handleStatusChange("en_route")} disabled={loading} className="adm-btn">
              Set en route
            </button>
          )}
          {resource.status === "en_route" && (
            <button onClick={() => handleStatusChange("at_scene")} disabled={loading} className="adm-btn">
              Set at scene
            </button>
          )}
          {resource.status === "at_scene" && (
            <button onClick={() => handleStatusChange("available")} disabled={loading} className="adm-btn">
              Return to base
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
