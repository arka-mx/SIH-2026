"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { EmergencyStats } from "@/components/admin/EmergencyStats";
import { DashboardCard } from "@/components/admin/DashboardCard";
import { IncidentMap } from "@/components/incidents/IncidentMap";
import { IncidentCard } from "@/components/incidents/IncidentCard";
import { ResponseTeamRequests } from "@/components/admin/ResponseTeamRequests";
import { CitizenResponsesFeed } from "@/components/admin/CitizenResponsesFeed";
import { Badge } from "@/components/ui/Badge";
import { 
  apiGetAllIncidents, 
  apiGetAllResources, 
  apiGetAutomatedPermissions, 
  apiGetResponseTeamRequests,
  apiGetCitizenResponses,
  apiGetRescuerLocations,
  ReportItem,
  ResourceItem
} from "@/lib/api";
import { PredeterminedPermissionSettings, ResponseTeamRequest, CitizenResponse, RescuerUnitProfile } from "@/types/rescuer";
import { useRealtimeIncidents } from "@/lib/socket";
import { Radio, RefreshCw, Sparkles, ShieldAlert, Zap, ArrowRight, Truck, Users } from "lucide-react";

export default function AdminPage() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<ReportItem | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [rescuers, setRescuers] = useState<RescuerUnitProfile[]>([]);
  const [permissions, setPermissions] = useState<PredeterminedPermissionSettings | null>(null);
  const [teamRequests, setTeamRequests] = useState<ResponseTeamRequest[]>([]);
  const [citizenResponses, setCitizenResponses] = useState<CitizenResponse[]>([]);
  const { incidents, setIncidents, isConnected } = useRealtimeIncidents([]);

  async function fetchFreshData() {
    try {
      const [incData, resData, permData, reqData, citData, rescData] = await Promise.all([
        apiGetAllIncidents(),
        apiGetAllResources(),
        apiGetAutomatedPermissions(),
        apiGetResponseTeamRequests(),
        apiGetCitizenResponses(),
        apiGetRescuerLocations(),
      ]);
      setIncidents(incData);
      setResources(resData);
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
  }, []);

  const verified = incidents.filter((i) => i.status === "verified");
  const inProgress = incidents.filter((i) => i.status === "in_progress");
  const unverified = incidents.filter((i) => i.status === "unverified");

  function handleSelectIncident(inc: ReportItem) {
    setSelectedIncident(inc);
  }

  return (
    <AdminShell>
      {/* Banner for Predetermined Permissions & Radical Regions */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-4 rounded-2xl mb-4 flex items-center justify-between flex-wrap gap-3 shadow-sm border border-purple-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30">
            <Zap size={22} className="text-purple-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded border border-purple-500/30">
                Predetermined Admin Rules
              </span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <i className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Auto-Alert System Active
              </span>
            </div>
            <h2 className="text-sm font-bold text-white mt-0.5">
              Direct Citizen-to-Rescuer Auto-Alerting for Radical Disaster Regions
            </h2>
          </div>
        </div>

        <Link
          href="/admin/permissions"
          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
        >
          Configure Permissions & Radical Zones <ArrowRight size={14} />
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <EmergencyStats incidents={incidents} />
      </div>

      {/* Automated Operations Brief Section */}
      <div className="bg-[#fffcf5] border border-[#e8dcc4] p-5 rounded-2xl mb-5 shadow-2xs">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#9c592e] flex items-center gap-1.5 mb-2.5">
          <Sparkles size={15} className="text-[#d77e37] animate-pulse" /> AUTOMATED MOMENTUM OPS BRIEF
        </h3>
        <div className="text-xs text-stone-700">
          {(() => {
            const active = incidents.filter((i) => i.status !== "resolved");
            const critical = active.filter((i) => 
              i.type === "fire" || 
              i.type === "medical" || 
              (i.description && i.description.includes("Injured:") && !i.description.includes("Injured: 0"))
            ).length;
            const pending = active.filter((i) => i.status === "unverified" || i.status === "verified").length;
            const fullShelters = resources.filter((r) => r.type === "shelter" && (r.capacity_used / r.capacity_total) >= 0.7).length;

            const briefs = [];
            if (critical > 0) {
              briefs.push(`⚠️ ${critical} critical incident${critical > 1 ? "s" : ""} require${critical === 1 ? "s" : ""} active resource coordination.`);
            } else {
              briefs.push(`✓ No active life-safety or fire hazards reported in the current window.`);
            }
            if (pending > 0) {
              briefs.push(`⏳ ${pending} incident report${pending > 1 ? "s are" : " is"} pending dispatch validation.`);
            }
            if (fullShelters > 0) {
              briefs.push(`🚨 ${fullShelters} emergency shelter${fullShelters > 1 ? "s are" : " is"} near capacity (>70%).`);
            } else {
              briefs.push(`✓ All district emergency camps are operating within normal occupancy limits.`);
            }

            return (
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {briefs.map((b, idx) => (
                  <li key={idx} className="bg-white/80 p-3 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-start gap-2 shadow-3xs">
                    {b}
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="space-y-4">
          <IncidentMap
            incidents={incidents}
            resources={resources}
            rescuers={rescuers}
            radicalRegions={permissions?.regions || []}
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

          {/* Unverified Reports */}
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

      {/* Response Team Requests & Citizen Responses Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ResponseTeamRequests requests={teamRequests} onRefresh={fetchFreshData} />
        <CitizenResponsesFeed responses={citizenResponses} />
      </div>
    </AdminShell>
  );
}

