"use client";

import { useState } from "react";
import { 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Radio, 
  Users, 
  ExternalLink,
  XCircle,
  Zap
} from "lucide-react";
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
      setActionSuccess(`Dispatched ${resourceName}! Capacity updated.`);
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
      setActionSuccess("Incident successfully marked as RESOLVED!");
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
      setActionSuccess(`Admin Denied → Auto-routed to nearest rescuer: ${res.rescuer.name} (${res.rescuer.callsign})`);
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
      className={`incident-card !p-4 transition-all ${
        isSelected ? "ring-2 ring-emerald-500 bg-emerald-50/20" : ""
      } ${isResolved ? "muted-card opacity-80" : ""}`}
      onClick={() => onSelect && onSelect(incident)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-stone-900 capitalize flex items-center gap-1.5">
              {incident.type} Incident
            </span>
            <Badge tone={getStatusTone(incident.status)}>
              {incident.status === "verified" ? "✓ Verified" : incident.status}
            </Badge>

            {incident.denied_by_admin && (
              <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-300 flex items-center gap-1">
                <Zap size={11} className="text-purple-600" /> Auto-Routed (Admin Denied)
              </span>
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-stone-500">
            <MapPin size={13} className="text-stone-400" />
            {incident.location_wkt || "GPS Coordinates"}
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold text-stone-400">
          #{incident.id.slice(0, 8)}
        </span>
      </div>

      {incident.description && (
        <p className="mt-2 text-xs text-stone-600 line-clamp-2 bg-stone-50 p-2 rounded">
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
        <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-emerald-600" /> {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-800 text-xs rounded flex items-center gap-1.5">
          <AlertCircle size={14} className="text-red-600" /> {actionError}
        </div>
      )}

      {/* Dynamic Action Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
        <span className="text-[11px] text-stone-400">
          {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        <div className="flex flex-wrap gap-1.5">
          {(isUnverified || isVerified) && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleLoadShortlist(); }}
                disabled={loadingShortlist || actionLoading}
                className="action-button primary text-xs !bg-emerald-600 hover:!bg-emerald-700 flex items-center gap-1"
              >
                <Sparkles size={13} />
                {showShortlist ? "Hide Shortlist" : "Assign Rescuer"}
              </button>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDenyAndAutoRoute(); }}
                disabled={actionLoading}
                className="action-button text-xs !bg-rose-50 text-rose-700 border-rose-300 hover:!bg-rose-100 flex items-center gap-1 font-bold"
                title="Deny request and automatically route directly to nearest available rescuer"
              >
                <XCircle size={13} className="text-rose-600" />
                Deny Request (Auto-Route)
              </button>
            </>
          )}

          {isInProgress && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleResolve(); }}
              disabled={actionLoading}
              className="action-button primary text-xs !bg-blue-600 hover:!bg-blue-700 flex items-center gap-1"
            >
              <CheckCircle2 size={13} />
              {actionLoading ? "Resolving..." : "Mark Resolved"}
            </button>
          )}

          {isResolved && (
            <span className="text-xs font-semibold text-stone-400 flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-500" /> Closed
            </span>
          )}
        </div>
      </div>

      {/* Allocation Engine Shortlist Panel */}
      {showShortlist && (
        <div className="mt-3 p-3 bg-stone-50 rounded-xl border border-stone-200 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-600" /> Top Ranked Matched Resources
            </span>
            <span className="text-[10px] text-stone-500">Allocation Engine</span>
          </div>

          {loadingShortlist ? (
            <div className="text-xs text-stone-500 py-3 text-center">Evaluating capacity & disaster-type fit...</div>
          ) : !shortlist || shortlist.length === 0 ? (
            <div className="text-xs text-stone-500 py-2">No available resources found for this disaster type.</div>
          ) : (
            <div className="space-y-2">
              {shortlist.map((res, index) => {
                const availableCap = res.capacity_total - res.capacity_used;
                return (
                  <div key={res.id} className="p-2.5 bg-white rounded-lg border border-stone-200 flex items-center justify-between gap-2 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">
                          {index + 1}
                        </span>
                        <strong className="text-xs text-stone-900">{res.name}</strong>
                        <span className="text-[10px] uppercase font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                          {res.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-2">
                        <span>Distance: <b>{Math.round(res.distance_meters || 0)}m</b></span>
                        <span>·</span>
                        <span>Capacity: <b>{availableCap}/{res.capacity_total}</b></span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleConfirmDispatch(res.id, res.name)}
                      disabled={actionLoading || availableCap <= 0}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-2xs whitespace-nowrap flex items-center gap-1"
                    >
                      <Send size={11} /> Confirm Dispatch
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
