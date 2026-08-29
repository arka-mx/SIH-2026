"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { IncidentList } from "@/components/incidents/IncidentList";
import { apiGetAllIncidents, ReportItem } from "@/lib/api";
import { useRealtimeIncidents } from "@/lib/socket";
import { Sparkles, RotateCw } from "lucide-react";

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
        <div>
          <p className="eyebrow">Trust-Layer Confirmed Incidents</p>
          <h1 className="flex items-center gap-2">
            Verified & Active Cases <Sparkles size={22} className="text-emerald-600" />
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1 text-xs bg-white border border-stone-200 hover:border-emerald-500 px-3 py-1.5 rounded-lg shadow-2xs transition-all"
          >
            <RotateCw size={13} /> Refresh
          </button>
          <span className="login-note">
            {verifiedAndInProgress.length} verified/active incident(s)
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-stone-500 bg-white rounded-xl border border-stone-200">
          Loading verified cases...
        </div>
      ) : (
        <IncidentList incidents={verifiedAndInProgress} onUpdate={loadData} />
      )}
    </AdminShell>
  );
}
