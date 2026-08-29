"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { AutomatedAlertPermissions } from "@/components/admin/AutomatedAlertPermissions";
import { 
  apiGetAutomatedPermissions, 
  apiGetCitizenResponses, 
  apiGetResponseTeamRequests, 
  apiGetAllIncidents, 
  ReportItem 
} from "@/lib/api";
import { PredeterminedPermissionSettings, CitizenResponse, ResponseTeamRequest } from "@/types/rescuer";
import { IncidentMap } from "@/components/incidents/IncidentMap";
import { ResponseTeamRequests } from "@/components/admin/ResponseTeamRequests";
import { CitizenResponsesFeed } from "@/components/admin/CitizenResponsesFeed";
import { ShieldCheck, Sparkles, RefreshCw } from "lucide-react";

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<PredeterminedPermissionSettings | null>(null);
  const [incidents, setIncidents] = useState<ReportItem[]>([]);
  const [teamRequests, setTeamRequests] = useState<ResponseTeamRequest[]>([]);
  const [citizenResponses, setCitizenResponses] = useState<CitizenResponse[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [permData, incData, reqData, citData] = await Promise.all([
        apiGetAutomatedPermissions(),
        apiGetAllIncidents(),
        apiGetResponseTeamRequests(),
        apiGetCitizenResponses(),
      ]);
      setPermissions(permData);
      setIncidents(incData);
      setTeamRequests(reqData);
      setCitizenResponses(citData);
    } catch (err) {
      console.error("Failed to load admin permission data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="text-purple-600" size={24} /> Admin Auto-Alert Permissions & Radical Region Controls
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Configure predetermined admin permissions for automatic citizen-to-rescuer SOS broadcasting in high-risk disaster zones.
            </p>
          </div>

          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-lg border border-stone-300 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh Data
          </button>
        </div>

        {permissions && (
          <AutomatedAlertPermissions settings={permissions} onUpdate={loadData} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponseTeamRequests requests={teamRequests} onRefresh={loadData} />
          <CitizenResponsesFeed responses={citizenResponses} />
        </div>

        <IncidentMap
          incidents={incidents}
          radicalRegions={permissions?.regions || []}
        />
      </div>
    </AdminShell>
  );
}
