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
        <div>
          <p className="eyebrow">Awaiting Spatial Clustering Confirmation</p>
          <h1 className="flex items-center gap-2">
            Unverified Incoming Reports <AlertTriangle size={22} className="text-amber-500" />
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
            {unverified.length} pending report(s)
          </span>
        </div>
      </div>

      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs">
        ℹ️ <strong>Trust Layer Logic:</strong> Single reports stay unverified to prevent false alarms. Once 3 or more independent citizen sessions submit reports within ~200 meters and 15 minutes, the cluster automatically flips to <b>Verified</b>.
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-stone-500 bg-white rounded-xl border border-stone-200">
          Loading unverified reports...
        </div>
      ) : (
        <IncidentList incidents={unverified} onUpdate={loadData} />
      )}
    </AdminShell>
  );
}
