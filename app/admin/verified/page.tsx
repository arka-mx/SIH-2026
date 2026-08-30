"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { IncidentList } from "@/components/incidents/IncidentList";
import { apiGetAllIncidents, ReportItem } from "@/lib/api";
import { useRealtimeIncidents } from "@/lib/socket";
import { RotateCw } from "lucide-react";

export default function VerifiedPage() {
  const { incidents, setIncidents } = useRealtimeIncidents([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      const data = await apiGetAllIncidents();
      setIncidents(data);
    } catch (err) {
      console.warn("Could not load verified incidents:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const verifiedAndInProgress = incidents.filter(
    (i) => i.status === "verified" || i.status === "in_progress"
  );

  return (
    <AdminShell>
      <div className="page-heading">
        <h1>Verified</h1>
        <div className="flex items-center gap-3">
          <span className="login-note">{verifiedAndInProgress.length} cases</span>
          <button onClick={loadData} className="adm-btn">
            <RotateCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading…</p>
        </div>
      ) : (
        <IncidentList incidents={verifiedAndInProgress} onUpdate={loadData} />
      )}
    </AdminShell>
  );
}
