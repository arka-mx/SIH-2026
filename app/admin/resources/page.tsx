"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceMap } from "@/components/resources/ResourceMap";
import { apiGetAllResources, ResourceItem } from "@/lib/api";
import { RotateCw } from "lucide-react";

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
        <h1>Resources</h1>
        <div className="flex items-center gap-3">
          <span className="login-note">
            {resources.length} assets · {totalUsed.toLocaleString()} deployed
          </span>
          <button onClick={loadResources} className="adm-btn">
            <RotateCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="resource-overview">
        <div className="resource-stat">
          <span>Capacity</span>
          <strong>{totalCapacity.toLocaleString()}</strong>
        </div>
        <div className="resource-stat">
          <span>Deployed</span>
          <strong>{totalUsed.toLocaleString()}</strong>
        </div>
        <div className="resource-stat">
          <span>Available</span>
          <strong>{availableCount}</strong>
        </div>
        <div className="resource-stat">
          <span>In action</span>
          <strong>{deployedCount}</strong>
        </div>
      </div>

      <ResourceMap resources={resources} />

      {loading ? (
        <div className="empty-state">
          <p>Loading…</p>
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
