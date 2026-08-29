"use client";

import { useState } from "react";
import { 
  Truck, 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertOctagon, 
  Send, 
  MapPin, 
  Radio, 
  ShieldAlert, 
  Wrench, 
  HeartPulse 
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
    if (filterType === "all") return true;
    if (filterType === "pending") return r.status === "pending";
    if (filterType === "critical") return r.urgency === "critical";
    return true;
  });

  async function handleStatusChange(id: string, newStatus: "approved" | "dispatched" | "fulfilled") {
    setLoadingId(id);
    try {
      await apiUpdateTeamRequestStatus(id, newStatus);
      setSuccessMsg(`Request #${id} marked as ${newStatus.toUpperCase()}`);
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
      case "supplies": return <Package size={16} className="text-amber-600" />;
      case "equipment": return <Wrench size={16} className="text-blue-600" />;
      case "reinforcement": return <Truck size={16} className="text-emerald-600" />;
      case "medical_evac": return <HeartPulse size={16} className="text-rose-600" />;
      default: return <Radio size={16} className="text-stone-600" />;
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-stone-100">
        <div>
          <span className="eyebrow uppercase text-[11px] text-stone-500 font-bold tracking-wider">Field Logistics & Support</span>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Truck size={18} className="text-blue-600" /> Response Team Requests
            <span className="bg-blue-100 text-blue-800 font-mono text-xs px-2 py-0.5 rounded-full font-bold">
              {requests.filter(r => r.status === "pending").length} Pending
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {successMsg && (
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-600" /> {successMsg}
            </span>
          )}
          <div className="flex bg-stone-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded-md transition-all ${filterType === "all" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500"}`}
            >
              All ({requests.length})
            </button>
            <button
              onClick={() => setFilterType("pending")}
              className={`px-2.5 py-1 rounded-md transition-all ${filterType === "pending" ? "bg-amber-500 text-white shadow-2xs" : "text-stone-500"}`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterType("critical")}
              className={`px-2.5 py-1 rounded-md transition-all ${filterType === "critical" ? "bg-rose-600 text-white shadow-2xs" : "text-stone-500"}`}
            >
              Critical
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-6 text-center text-xs text-stone-400">
          No response team requests found matching filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div
              key={req.id}
              className={`p-3.5 rounded-xl border transition-all ${
                req.urgency === "critical"
                  ? "bg-rose-50/40 border-rose-200"
                  : req.status === "pending"
                  ? "bg-amber-50/40 border-amber-200"
                  : "bg-stone-50/60 border-stone-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-white rounded-lg border border-stone-200 shadow-2xs mt-0.5">
                    {getTypeIcon(req.requestType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-stone-900 font-bold">{req.title}</strong>
                      <span className="font-mono text-[11px] text-stone-500">{req.id}</span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1">{req.details}</p>
                    <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-2 flex-wrap">
                      <span className="font-semibold text-stone-800 flex items-center gap-1">
                        <Radio size={12} className="text-emerald-600" /> {req.unitName} ({req.callsign})
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-stone-400" /> {req.locationName}
                      </span>
                      <span className="flex items-center gap-1 text-stone-400 font-mono">
                        <Clock size={11} /> {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {req.urgency === "critical" && (
                      <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider animate-pulse">
                        <ShieldAlert size={10} /> Critical SOS
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      req.status === "pending"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : req.status === "approved"
                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {req.status === "pending" && (
                      <button
                        onClick={() => handleStatusChange(req.id, "approved")}
                        disabled={loadingId === req.id}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1"
                      >
                        <CheckCircle2 size={12} /> Approve Supply
                      </button>
                    )}
                    {req.status === "approved" && (
                      <button
                        onClick={() => handleStatusChange(req.id, "dispatched")}
                        disabled={loadingId === req.id}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1"
                      >
                        <Send size={12} /> Dispatch Truck
                      </button>
                    )}
                    {req.status === "dispatched" && (
                      <button
                        onClick={() => handleStatusChange(req.id, "fulfilled")}
                        disabled={loadingId === req.id}
                        className="px-2.5 py-1 bg-stone-700 hover:bg-stone-800 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1"
                      >
                        <CheckCircle2 size={12} /> Mark Fulfilled
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
