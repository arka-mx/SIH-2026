"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { EmergencyStats } from "@/components/admin/EmergencyStats";
import { DashboardCard } from "@/components/admin/DashboardCard";
import { IncidentMap } from "@/components/incidents/IncidentMap";
import { DisasterHeatmap } from "@/components/admin/DisasterHeatmap";
import { AllocationOptimizer } from "@/components/admin/AllocationOptimizer";
import { IncidentCard } from "@/components/incidents/IncidentCard";
import { ResponseTeamRequests } from "@/components/admin/ResponseTeamRequests";
import { CitizenResponsesFeed } from "@/components/admin/CitizenResponsesFeed";
import { RegisteredTeamHeadsManager } from "@/components/admin/RegisteredTeamHeadsManager";
import { Badge } from "@/components/ui/Badge";
import {
  apiGetAllIncidents,
  apiGetAllResources,
  apiGetAutomatedPermissions,
  apiGetResponseTeamRequests,
  apiGetCitizenResponses,
  apiGetRescuerLocations,
  apiGetActiveAllocations,
  ReportItem,
  ResourceItem,
  AllocationLine
} from "@/lib/api";
import { PredeterminedPermissionSettings, ResponseTeamRequest, CitizenResponse, RescuerUnitProfile } from "@/types/rescuer";
import { useRealtimeIncidents } from "@/lib/socket";
import { ArrowRight } from "lucide-react";

export default function AdminPage() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<ReportItem | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [allocations, setAllocations] = useState<AllocationLine[]>([]);
  const [rescuers, setRescuers] = useState<RescuerUnitProfile[]>([]);
  const [permissions, setPermissions] = useState<PredeterminedPermissionSettings | null>(null);
  const [teamRequests, setTeamRequests] = useState<ResponseTeamRequest[]>([]);
  const [citizenResponses, setCitizenResponses] = useState<CitizenResponse[]>([]);
  const { incidents, setIncidents, isConnected } = useRealtimeIncidents([]);

  async function fetchFreshData() {
    try {
      const [incData, resData, permData, reqData, citData, rescData, allocData] = await Promise.all([
        apiGetAllIncidents(),
        apiGetAllResources(),
        apiGetAutomatedPermissions(),
        apiGetResponseTeamRequests(),
        apiGetCitizenResponses(),
        apiGetRescuerLocations(),
        apiGetActiveAllocations(),
      ]);
      setIncidents(incData);
      setResources(resData);
      setAllocations(allocData);
      setRescuers(rescData);
      setPermissions(permData);
      setTeamRequests(reqData);
      setCitizenResponses(citData);
    } catch (err) {
      console.warn("Could not fetch fresh data from API:", err);
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    fetchFreshData();
    const interval = setInterval(() => {
      fetchFreshData();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const verified = incidents.filter((i) => i.status === "verified");
  const inProgress = incidents.filter((i) => i.status === "in_progress");
  const unverified = incidents.filter((i) => i.status === "unverified");

  function handleSelectIncident(inc: ReportItem) {
    setSelectedIncident(inc);
  }

  return (
    <AdminShell>
      <div className="page-heading">
        <h1>Dashboard</h1>
        <Link href="/admin/permissions" className="adm-btn">
          Auto-alert rules <ArrowRight size={14} />
        </Link>
      </div>

      <EmergencyStats incidents={incidents} />

      {/* Status brief */}
      <div className="adm-card adm-card--plain mb-6">
        <h3 className="eyebrow mb-3">Status</h3>
        <div className="text-xs text-slate-700">
          {(() => {
            const active = incidents.filter((i) => i.status !== "resolved" && i.status !== "cancelled");
            const critical = active.filter((i) =>
              i.type === "fire" ||
              i.type === "medical" ||
              (i.description && i.description.includes("Injured:") && !i.description.includes("Injured: 0"))
            ).length;
            const pending = active.filter((i) => i.status === "unverified" || i.status === "verified").length;
            const fullShelters = resources.filter((r) => r.type === "shelter" && (r.capacity_used / r.capacity_total) >= 0.7).length;

            const briefs: { tone: string; label: string; text: string }[] = [];
            if (critical > 0) {
              briefs.push({ tone: "adm-status--red", label: "Critical", text: `${critical} incident${critical > 1 ? "s" : ""} need resources` });
            } else {
              briefs.push({ tone: "adm-status--green", label: "Critical", text: `None active` });
            }
            if (pending > 0) {
              briefs.push({ tone: "adm-status--amber", label: "Pending", text: `${pending} report${pending > 1 ? "s" : ""} to validate` });
            }
            if (fullShelters > 0) {
              briefs.push({ tone: "adm-status--red", label: "Shelters", text: `${fullShelters} above 70% full` });
            } else {
              briefs.push({ tone: "adm-status--green", label: "Shelters", text: `Within capacity` });
            }

            return (
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {briefs.map((b, idx) => (
                  <li key={idx} className="border border-slate-200 bg-white p-3 flex flex-col gap-2 text-slate-700">
                    <span className={`adm-status ${b.tone}`}>{b.label}</span>
                    {b.text}
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
      </div>

      <DisasterHeatmap incidents={incidents} />

      <RegisteredTeamHeadsManager
        incidents={incidents}
        selectedIncident={selectedIncident}
        onRefreshData={fetchFreshData}
      />

      <AllocationOptimizer
        incidents={incidents}
        resources={resources}
        allocations={allocations}
        onDispatched={fetchFreshData}
      />

      <div className="dashboard-grid">
        <div className="space-y-4">
          <IncidentMap
            incidents={incidents}
            resources={resources}
            rescuers={rescuers}
            allocations={allocations}
            radicalRegions={permissions?.regions || []}
            selectedIncidentId={selectedIncident?.id}
            onSelectIncident={handleSelectIncident}
            isConnected={isConnected}
          />

          {selectedIncident && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="eyebrow">Selected incident</h3>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  Clear
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
          {/* Ready to dispatch */}
          <DashboardCard
            title="Ready to dispatch"
            count={verified.length}
            href="/admin/verified"
          >
            {verified.length === 0 ? (
              <div className="p-3 text-xs text-slate-400 text-center">None</div>
            ) : (
              verified.slice(0, 4).map((incident) => (
                <div
                  className={`mini-row cursor-pointer transition-colors hover:bg-slate-50 ${
                    selectedIncident?.id === incident.id ? "bg-slate-50" : ""
                  }`}
                  key={incident.id}
                  onClick={() => handleSelectIncident(incident)}
                >
                  <div>
                    <strong className="capitalize">{incident.type} incident</strong>
                    <span className="text-[11px] text-slate-500">
                      {incident.location_wkt || "GPS location"}
                    </span>
                  </div>
                  <Badge tone="green">Verified</Badge>
                </div>
              ))
            )}
          </DashboardCard>

          {/* In progress */}
          <DashboardCard
            title="In progress"
            count={inProgress.length}
            href="/admin/verified"
          >
            {inProgress.length === 0 ? (
              <div className="p-3 text-xs text-slate-400 text-center">None</div>
            ) : (
              inProgress.slice(0, 3).map((incident) => (
                <div
                  className="mini-row cursor-pointer transition-colors hover:bg-slate-50"
                  key={incident.id}
                  onClick={() => handleSelectIncident(incident)}
                >
                  <div>
                    <strong className="capitalize">{incident.type}</strong>
                    <span className="text-[11px] text-slate-500">
                      {incident.location_wkt || "GPS location"}
                    </span>
                  </div>
                  <Badge tone="neutral">En route</Badge>
                </div>
              ))
            )}
          </DashboardCard>

          {/* Unverified */}
          <DashboardCard
            title="Unverified"
            count={unverified.length}
            href="/admin/unverified"
          >
            {unverified.length === 0 ? (
              <div className="p-3 text-xs text-slate-400 text-center">None</div>
            ) : (
              unverified.slice(0, 4).map((incident) => (
                <div
                  className="mini-row cursor-pointer transition-colors hover:bg-slate-50"
                  key={incident.id}
                  onClick={() => handleSelectIncident(incident)}
                >
                  <div>
                    <strong className="capitalize">{incident.type}</strong>
                    <span className="text-[11px] text-slate-500">
                      {incident.location_wkt || "GPS location"}
                    </span>
                  </div>
                  <Badge tone="amber">1–2 reports</Badge>
                </div>
              ))
            )}
          </DashboardCard>
        </div>
      </div>

      {/* Response team requests & citizen responses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <ResponseTeamRequests requests={teamRequests} onRefresh={fetchFreshData} />
        <CitizenResponsesFeed responses={citizenResponses} />
      </div>
    </AdminShell>
  );
}
