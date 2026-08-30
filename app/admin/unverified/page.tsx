"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { IncidentList } from "@/components/incidents/IncidentList";
import { apiGetAllIncidents, ReportItem } from "@/lib/api";
import { useRealtimeIncidents } from "@/lib/socket";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function UnverifiedPage() {
  const { incidents, setIncidents } = useRealtimeIncidents([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      const data = await apiGetAllIncidents();
      setIncidents(data);
    } catch (err) {
      console.warn("Could not load unverified incidents:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const unverified = incidents.filter((i) => i.status === "unverified");

  return (
    <AdminShell>
      <div className="page-heading">
        <h1>Unverified</h1>
        <div className="flex items-center gap-3">
          <span className="login-note">{unverified.length} pending</span>
          <button onClick={loadData} className="adm-btn">
            <RotateCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="adm-note mb-5">
        <AlertTriangle size={15} />
        <span>
          Reports auto-verify when 3+ citizens report within 200&nbsp;m and 15&nbsp;minutes.
        </span>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading…</p>
        </div>
      ) : (
        <IncidentList incidents={unverified} onUpdate={loadData} />
      )}
    </AdminShell>
  );
}
