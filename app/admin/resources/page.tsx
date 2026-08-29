"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceMap } from "@/components/resources/ResourceMap";
import { apiGetAllResources, ResourceItem } from "@/lib/api";
import { RotateCw, PackageCheck, Layers } from "lucide-react";

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function loadResources() {
    try {
      setLoading(true);
      const data = await apiGetAllResources();
      setResources(data);
    } catch (err) {
      console.warn("Could not load resources from API:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResources();
  }, []);

  const totalCapacity = resources.reduce((sum, res) => sum + (res.capacity_total || 0), 0);
  const totalUsed = resources.reduce((sum, res) => sum + (res.capacity_used || 0), 0);
  const availableCount = resources.filter((res) => res.status === "available").length;
  const deployedCount = resources.filter((res) => res.status === "en_route" || res.status === "at_scene").length;

  return (
    <AdminShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">District Inventory and Deployment</p>
          <h1>Emergency Response Assets</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadResources}
            className="flex items-center gap-1 text-xs bg-white border border-stone-200 hover:border-emerald-500 px-3 py-1.5 rounded-lg shadow-2xs transition-all"
          >
            <RotateCw size={13} /> Refresh
          </button>
          <span className="login-note">
            {resources.length} tracked asset(s) · {totalUsed.toLocaleString()} units deployed
          </span>
        </div>
      </div>

      <div className="resource-overview">
        <div className="resource-stat">
          <span>Total Capacity</span>
          <strong>{totalCapacity.toLocaleString()}</strong>
          <small>across all response depots</small>
        </div>
        <div className="resource-stat">
          <span>Currently Deployed</span>
          <strong>{totalUsed.toLocaleString()}</strong>
          <small>active disaster allocations</small>
        </div>
        <div className="resource-stat">
          <span>Available Assets</span>
          <strong>{availableCount}</strong>
          <small>ready for instant dispatch</small>
        </div>
        <div className="resource-stat">
          <span>In Action</span>
          <strong>{deployedCount}</strong>
          <small>en route or at scene</small>
        </div>
      </div>

      <ResourceMap resources={resources} />

      {loading ? (
        <div className="p-8 text-center text-sm text-stone-500 bg-white rounded-xl border border-stone-200">
          Loading district resource inventory...
        </div>
      ) : (
        <div className="resource-grid">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} onUpdate={loadResources} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}
