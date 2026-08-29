"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { EmergencyStats } from "@/components/admin/EmergencyStats";
import { DashboardCard } from "@/components/admin/DashboardCard";
import { IncidentMap } from "@/components/incidents/IncidentMap";
import { IncidentCard } from "@/components/incidents/IncidentCard";
import { Badge } from "@/components/ui/Badge";
import { apiGetAllIncidents, ReportItem } from "@/lib/api";
import { useRealtimeIncidents } from "@/lib/socket";
import { Radio, RefreshCw, Sparkles, ShieldAlert } from "lucide-react";

export default function AdminPage() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<ReportItem | null>(null);
  const { incidents, setIncidents, isConnected } = useRealtimeIncidents([]);

  async function fetchFreshData() {
    try {
      const data = await apiGetAllIncidents();
      setIncidents(data);
    } catch (err) {
      console.warn("Could not fetch fresh incidents from API:", err);
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    fetchFreshData();
  }, []);

  const verified = incidents.filter((i) => i.status === "verified");
  const inProgress = incidents.filter((i) => i.status === "in_progress");
  const unverified = incidents.filter((i) => i.status === "unverified");

  function handleSelectIncident(inc: ReportItem) {
    setSelectedIncident(inc);
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-2">
        <EmergencyStats incidents={incidents} />
      </div>

      <div className="dashboard-grid">
        <div className="space-y-4">
          <IncidentMap
            incidents={incidents}
            selectedIncidentId={selectedIncident?.id}
            onSelectIncident={handleSelectIncident}
            isConnected={isConnected}
          />

          {selectedIncident && (
            <div className="p-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                  <ShieldAlert size={16} className="text-emerald-600" /> Selected Active Incident (Map Inspection)
                </h3>
                <button 
                  onClick={() => setSelectedIncident(null)}
                  className="text-xs text-stone-500 hover:text-stone-800"
                >
                  Clear Selection
                </button>
              </div>
              <IncidentCard
                incident={selectedIncident}
                onUpdate={fetchFreshData}
                isSelected={true}
              />
            </div>
          )}
        </div>

        <div className="dashboard-side space-y-4">
          {/* Verified / Dispatch Ready Cases */}
          <DashboardCard
            title="Verified (Ready for Dispatch)"
            count={verified.length}
            href="/admin/verified"
          >
            {verified.length === 0 ? (
              <div className="p-3 text-xs text-stone-400 text-center">
                No verified cases awaiting dispatch.
              </div>
            ) : (
              verified.slice(0, 4).map((incident) => (
                <div
                  className={`mini-row cursor-pointer hover:bg-emerald-50/50 p-2 rounded transition-all ${
                    selectedIncident?.id === incident.id ? "bg-emerald-50 ring-1 ring-emerald-400" : ""
                  }`}
                  key={incident.id}
                  onClick={() => handleSelectIncident(incident)}
                >
                  <div>
                    <strong className="capitalize flex items-center gap-1">
                      {incident.type} Incident
                      <Sparkles size={12} className="text-emerald-600" />
                    </strong>
                    <span className="text-[11px] text-stone-500">
                      {incident.location_wkt || "GPS Location"}
                    </span>
                  </div>
                  <Badge tone="green">Verified (3+)</Badge>
                </div>
              ))
            )}
          </DashboardCard>

          {/* In Progress Deployments */}
          <DashboardCard
            title="Active Dispatches (In Progress)"
            count={inProgress.length}
            href="/admin/verified"
          >
            {inProgress.length === 0 ? (
              <div className="p-3 text-xs text-stone-400 text-center">
                No active dispatches currently en route.
              </div>
            ) : (
              inProgress.slice(0, 3).map((incident) => (
                <div
                  className="mini-row cursor-pointer hover:bg-blue-50/50 p-2 rounded"
                  key={incident.id}
                  onClick={() => handleSelectIncident(incident)}
                >
                  <div>
                    <strong className="capitalize">{incident.type}</strong>
                    <span className="text-[11px] text-stone-500">
                      {incident.location_wkt || "GPS Location"}
                    </span>
                  </div>
                  <Badge tone="neutral">En Route</Badge>
                </div>
              ))
            )}
          </DashboardCard>

          {/* Unverified Reports (Gathering Cluster) */}
          <DashboardCard
            title="Unverified incoming reports"
            count={unverified.length}
            href="/admin/unverified"
          >
            {unverified.length === 0 ? (
              <div className="p-3 text-xs text-stone-400 text-center">
                No unverified reports pending.
              </div>
            ) : (
              unverified.slice(0, 4).map((incident) => (
                <div
                  className="mini-row cursor-pointer hover:bg-amber-50/50 p-2 rounded"
                  key={incident.id}
                  onClick={() => handleSelectIncident(incident)}
                >
                  <div>
                    <strong className="capitalize">{incident.type}</strong>
                    <span className="text-[11px] text-stone-500">
                      {incident.location_wkt || "GPS Location"}
                    </span>
                  </div>
                  <Badge tone="amber">1-2 Reports</Badge>
                </div>
              ))
            )}
          </DashboardCard>
        </div>
      </div>
    </AdminShell>
  );
}
