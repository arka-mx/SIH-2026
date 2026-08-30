"use client";

import { useState } from "react";
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  Send,
  MapPin,
  Radio,
  Wrench,
  HeartPulse,
} from "lucide-react";
import { ResponseTeamRequest, apiUpdateTeamRequestStatus } from "@/lib/api";

interface ResponseTeamRequestsProps {
  requests: ResponseTeamRequest[];
  onRefresh?: () => void;
}

export function ResponseTeamRequests({ requests, onRefresh }: ResponseTeamRequestsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filtered = requests.filter((r) => {
    if (filterType === "pending") return r.status === "pending";
    if (filterType === "critical") return r.urgency === "critical";
    return true;
  });

  async function handleStatusChange(id: string, newStatus: "approved" | "dispatched" | "fulfilled") {
    setLoadingId(id);
    try {
      await apiUpdateTeamRequestStatus(id, newStatus);
      setSuccessMsg(`Request ${id} marked ${newStatus}`);
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setLoadingId(null);
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case "supplies": return <Package size={15} />;
      case "equipment": return <Wrench size={15} />;
      case "reinforcement": return <Truck size={15} />;
      case "medical_evac": return <HeartPulse size={15} />;
      default: return <Radio size={15} />;
    }
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="adm-card space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3 pb-4 border-b border-slate-200">
        <h2 className="section-title">
          Team requests
          <span className="ml-2 text-xs font-mono font-bold text-slate-400">{pendingCount} pending</span>
        </h2>

        <div className="flex items-center gap-2 flex-wrap">
          {successMsg && (
            <span className="adm-status adm-status--green">
              <CheckCircle2 size={12} /> Updated
            </span>
          )}
          <div className="adm-segment">
            {[
              { key: "all", label: `All (${requests.length})` },
              { key: "pending", label: "Pending" },
              { key: "critical", label: "Critical" },
            ].map((f) => (
              <button key={f.key} data-active={filterType === f.key} onClick={() => setFilterType(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400">None</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((req) => (
            <div
              key={req.id}
              className={`border border-slate-200 border-l-[3px] p-3.5 ${
                req.urgency === "critical"
                  ? "border-l-red-600"
                  : req.status === "pending"
                  ? "border-l-amber-500"
                  : "border-l-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 border border-slate-200 p-1.5 text-slate-600">
                    {getTypeIcon(req.requestType)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm text-slate-900 font-bold">{req.title}</strong>
                      <span className="font-mono text-[11px] text-slate-400">{req.id}</span>
                      {req.urgency === "critical" && (
                        <span className="adm-status adm-status--red">Critical</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{req.details}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 flex-wrap">
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <Radio size={12} /> {req.unitName} ({req.callsign})
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {req.locationName}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock size={11} />{" "}
                        {new Date(req.requestedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`adm-status ${
                      req.status === "pending"
                        ? "adm-status--amber"
                        : req.status === "approved"
                        ? "adm-status--blue"
                        : "adm-status--green"
                    }`}
                  >
                    {req.status}
                  </span>

                  {req.status === "pending" && (
                    <button
                      onClick={() => handleStatusChange(req.id, "approved")}
                      disabled={loadingId === req.id}
                      className="adm-btn adm-btn--primary"
                    >
                      <CheckCircle2 size={12} /> Approve
                    </button>
                  )}
                  {req.status === "approved" && (
                    <button
                      onClick={() => handleStatusChange(req.id, "dispatched")}
                      disabled={loadingId === req.id}
                      className="adm-btn adm-btn--primary"
                    >
                      <Send size={12} /> Dispatch
                    </button>
                  )}
                  {req.status === "dispatched" && (
                    <button
                      onClick={() => handleStatusChange(req.id, "fulfilled")}
                      disabled={loadingId === req.id}
                      className="adm-btn"
                    >
                      <CheckCircle2 size={12} /> Fulfilled
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
