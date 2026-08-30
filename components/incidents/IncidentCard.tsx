"use client";

import { useState } from "react";
import { MapPin, Send, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { ReportItem, ResourceItem, apiGetShortlist, apiConfirmAllocation, apiResolveIncident, apiUpdateResourceStatus, apiDenyIncidentAndAutoRoute } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";

interface IncidentCardProps {
  incident: ReportItem;
  onUpdate?: () => void;
  onSelect?: (incident: ReportItem) => void;
  isSelected?: boolean;
}

export function IncidentCard({
  incident,
  onUpdate,
  onSelect,
  isSelected = false,
}: IncidentCardProps) {
  const [shortlist, setShortlist] = useState<ResourceItem[] | null>(null);
  const [loadingShortlist, setLoadingShortlist] = useState(false);
  const [showShortlist, setShowShortlist] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const isVerified = incident.status === "verified";
  const isInProgress = incident.status === "in_progress";
  const isResolved = incident.status === "resolved";
  const isUnverified = incident.status === "unverified";

  async function handleLoadShortlist() {
    if (showShortlist) {
      setShowShortlist(false);
      return;
    }
    setLoadingShortlist(true);
    setActionError(null);
    try {
      const data = await apiGetShortlist(incident.id);
      setShortlist(data);
      setShowShortlist(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load shortlist";
      setActionError(msg);
    } finally {
      setLoadingShortlist(false);
    }
  }

  async function handleConfirmDispatch(resourceId: string, resourceName: string) {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiConfirmAllocation(incident.id, resourceId);
      setActionSuccess(`Dispatched ${resourceName}`);
      setShowShortlist(false);
      if (onUpdate) onUpdate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to confirm dispatch";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResolve() {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiResolveIncident(incident.id);
      setActionSuccess("Resolved");
      if (onUpdate) onUpdate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resolve incident";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDenyAndAutoRoute() {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await apiDenyIncidentAndAutoRoute(incident.id);
      setActionSuccess(`Routed to ${res.rescuer.name} (${res.rescuer.callsign})`);
      setShowShortlist(false);
      if (onUpdate) onUpdate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to deny and auto-route request";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  function getStatusTone(status: string): "amber" | "green" | "red" | "neutral" {
    if (status === "verified") return "green";
    if (status === "in_progress") return "neutral";
    if (status === "resolved") return "green";
    return "amber";
  }

  return (
    <article
      className={`incident-card transition-colors ${
        isSelected ? "is-selected" : ""
      } ${isResolved ? "muted-card" : ""}`}
      onClick={() => onSelect && onSelect(incident)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900 capitalize">
              {incident.type} incident
            </span>
            <Badge tone={getStatusTone(incident.status)}>
              {incident.status.replace("_", " ")}
            </Badge>

            {incident.denied_by_admin && (
              <span className="adm-status adm-status--mute">Auto-routed</span>
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={13} className="text-slate-400" />
            {incident.location_wkt || "GPS coordinates"}
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400">
          #{incident.id.slice(0, 8)}
        </span>
      </div>

      {incident.description && (
        <p className="mt-2 text-xs text-slate-600 line-clamp-2 bg-slate-50 border border-slate-200 p-2">
          {incident.description}
        </p>
      )}

      {incident.photo_url && (
        <div className="mt-2">
          <img 
            src={incident.photo_url.startsWith("http") ? incident.photo_url : `http://localhost:4000${incident.photo_url}`} 
            alt="Incident evidence"
            className="w-full h-28 object-cover rounded-lg border border-stone-200"
          />
        </div>
      )}

      {actionSuccess && (
        <div className="mt-2 p-2 border border-green-300 text-green-800 text-xs flex items-center gap-1.5">
          <CheckCircle2 size={14} /> {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="mt-2 p-2 border border-red-300 text-red-800 text-xs flex items-center gap-1.5">
          <AlertCircle size={14} /> {actionError}
        </div>
      )}

      {/* Action bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
        <span className="text-[11px] text-slate-400">
          {new Date(incident.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>

        <div className="flex flex-wrap gap-1.5">
          {(isUnverified || isVerified) && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleLoadShortlist(); }}
                disabled={loadingShortlist || actionLoading}
                className="adm-btn adm-btn--primary"
              >
                {showShortlist ? "Hide shortlist" : "Assign rescuer"}
              </button>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDenyAndAutoRoute(); }}
                disabled={actionLoading}
                className="adm-btn adm-btn--danger"
                title="Deny and route to nearest available rescuer"
              >
                <XCircle size={13} /> Deny
              </button>
            </>
          )}

          {isInProgress && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleResolve(); }}
              disabled={actionLoading}
              className="adm-btn adm-btn--primary"
            >
              <CheckCircle2 size={13} />
              {actionLoading ? "Resolving…" : "Resolve"}
            </button>
          )}

          {isResolved && (
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <CheckCircle2 size={13} /> Closed
            </span>
          )}
        </div>
      </div>

      {/* Allocation shortlist */}
      {showShortlist && (
        <div className="mt-3 p-3 bg-slate-50 border border-slate-200" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow">Nearest resources</span>
          </div>

          {loadingShortlist ? (
            <div className="text-xs text-slate-500 py-3 text-center">Evaluating…</div>
          ) : !shortlist || shortlist.length === 0 ? (
            <div className="text-xs text-slate-500 py-2">No resources available.</div>
          ) : (
            <div className="space-y-2">
              {shortlist.map((res, index) => {
                const availableCap = res.capacity_total - res.capacity_used;
                return (
                  <div key={res.id} className="p-2.5 bg-white border border-slate-200 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 border border-slate-300 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                          {index + 1}
                        </span>
                        <strong className="text-xs text-slate-900">{res.name}</strong>
                        <span className="text-[10px] uppercase font-semibold text-slate-500 border border-slate-200 px-1.5 py-0.5">
                          {res.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                        <span><b>{Math.round(res.distance_meters || 0)} m</b></span>
                        <span>·</span>
                        <span><b>{availableCap}/{res.capacity_total}</b> free</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleConfirmDispatch(res.id, res.name)}
                      disabled={actionLoading || availableCap <= 0}
                      className="adm-btn adm-btn--primary whitespace-nowrap"
                    >
                      <Send size={11} /> Dispatch
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
