"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { AutomatedAlertPermissions } from "@/components/admin/AutomatedAlertPermissions";
import { 
  apiGetAutomatedPermissions, 
  apiGetCitizenResponses, 
  apiGetResponseTeamRequests,
  apiGetAllIncidents,
  apiGetRescuerLocations,
  ReportItem
} from "@/lib/api";
import { PredeterminedPermissionSettings, CitizenResponse, ResponseTeamRequest, RescuerUnitProfile } from "@/types/rescuer";
import { IncidentMap } from "@/components/incidents/IncidentMap";
import { ResponseTeamRequests } from "@/components/admin/ResponseTeamRequests";
import { CitizenResponsesFeed } from "@/components/admin/CitizenResponsesFeed";
import { RefreshCw } from "lucide-react";

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<PredeterminedPermissionSettings | null>(null);
  const [incidents, setIncidents] = useState<ReportItem[]>([]);
  const [teamRequests, setTeamRequests] = useState<ResponseTeamRequest[]>([]);
  const [citizenResponses, setCitizenResponses] = useState<CitizenResponse[]>([]);
  const [rescuers, setRescuers] = useState<RescuerUnitProfile[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [permData, incData, reqData, citData, rescData] = await Promise.all([
        apiGetAutomatedPermissions(),
        apiGetAllIncidents(),
        apiGetResponseTeamRequests(),
        apiGetCitizenResponses(),
        apiGetRescuerLocations(),
      ]);
      setPermissions(permData);
      setIncidents(incData);
      setRescuers(rescData);
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
        <div className="page-heading">
          <h1>Auto-alert rules</h1>
          <button onClick={loadData} className="adm-btn">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
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
          rescuers={rescuers}
          radicalRegions={permissions?.regions || []}
        />
      </div>
    </AdminShell>
  );
}
