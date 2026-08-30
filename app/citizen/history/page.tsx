"use client";

import { useEffect, useState } from "react";
import { 
  Clock3, 
  CheckCircle, 
  MapPin, 
  Radio, 
  ShieldCheck, 
  RotateCw, 
  ArrowRight,
  Flame,
  Waves,
  Wind,
  Mountain,
  HeartPulse,
  Sparkles,
  Share2
} from "lucide-react";
import Link from "next/link";
import { CitizenShell } from "@/components/citizen/CitizenShell";
import { 
  apiGetCitizenReports, 
  apiGetAllResources, 
  apiGetRescuerLocations, 
  ReportItem, 
  ResourceItem 
} from "@/lib/api";
import { RescuerUnitProfile } from "@/types/rescuer";
import { getOrCreateSessionId } from "@/lib/session";
import { getSocket } from "@/lib/socket";
import dynamic from "next/dynamic";

const CitizenTrackingMap = dynamic(
  () => import("@/components/citizen/CitizenTrackingMap").then((mod) => mod.CitizenTrackingMap),
  { ssr: false, loading: () => <div className="h-[180px] bg-stone-50 border rounded-lg animate-pulse flex items-center justify-center text-xs text-stone-400">Loading live tracking map...</div> }
);

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CitizenHistoryPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [rescuers, setRescuers] = useState<RescuerUnitProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionId, setSessionId] = useState<string>("");
  const [liveEvent, setLiveEvent] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadReports(id: string) {
    if (!id) return;
    try {
      setLoading(true);
      const [reportData, resData, rescData] = await Promise.all([
        apiGetCitizenReports(id),
        apiGetAllResources(),
        apiGetRescuerLocations()
      ]);
      setReports(reportData);
      setResources(resData);
      setRescuers(rescData);
    } catch (err) {
      console.warn("Could not load reports for session:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleShare(reportId: string) {
    const shareUrl = `${window.location.origin}/safe/${reportId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(reportId);
    setTimeout(() => setCopiedId(null), 2500);
  }

  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);
    loadReports(id);

    // Setup live socket listeners for closing the loop
    const socket = getSocket();

    function handleReportVerified(verifiedReports: ReportItem[]) {
      const verifiedIds = new Set(verifiedReports.map((r) => r.id));
      setReports((prev) =>
        prev.map((rep) => {
          if (verifiedIds.has(rep.id)) {
            setLiveEvent(`Report #${rep.id.slice(0, 8)} verified by trust clustering!`);
            return { ...rep, status: "verified" };
          }
          return rep;
        })
      );
    }

    function handleAllocationConfirmed(data: { report: ReportItem }) {
      setReports((prev) =>
        prev.map((rep) => {
          if (rep.id === data.report.id) {
            setLiveEvent(`Rescue resources dispatched for Incident #${rep.id.slice(0, 8)}!`);
            return { ...rep, status: "in_progress" };
          }
          return rep;
        })
      );
    }

    function handleIncidentResolved(data: { report: ReportItem }) {
      setReports((prev) =>
        prev.map((rep) => {
          if (rep.id === data.report.id) {
            setLiveEvent(`Incident #${rep.id.slice(0, 8)} marked as fully RESOLVED!`);
            return { ...rep, status: "resolved" };
          }
          return rep;
        })
      );
    }

    socket.on("report_verified", handleReportVerified);
    socket.on("allocation_confirmed", handleAllocationConfirmed);
    socket.on("incident_resolved", handleIncidentResolved);

    return () => {
      socket.off("report_verified", handleReportVerified);
      socket.off("allocation_confirmed", handleAllocationConfirmed);
      socket.off("incident_resolved", handleIncidentResolved);
    };
  }, []);

  function getDisasterIcon(type: string) {
    switch (type.toLowerCase()) {
      case "flood": return <Waves size={18} className="text-blue-500" />;
      case "cyclone": return <Wind size={18} className="text-cyan-500" />;
      case "fire": return <Flame size={18} className="text-orange-500" />;
      case "landslide": return <Mountain size={18} className="text-amber-700" />;
      case "medical": return <HeartPulse size={18} className="text-rose-500" />;
      default: return <Radio size={18} className="text-emerald-500" />;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "unverified":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Unverified (Gathering Reports)
          </span>
        );
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Sparkles size={12} className="text-emerald-600" />
            Verified (3+ Reports Confirmed)
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
            In Progress (Rescue Dispatched)
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-700 text-white shadow-xs">
            <CheckCircle size={13} />
            Resolved & Safe
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-800">
            {status}
          </span>
        );
    }
  }

  return (
    <CitizenShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Closed-Loop Status Tracking</p>
          <h1>Your Active Reports</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadReports(sessionId)}
            className="flex items-center gap-1 text-xs bg-white border border-stone-200 hover:border-emerald-500 px-3 py-1.5 rounded-lg shadow-2xs transition-all"
          >
            <RotateCw size={13} /> Refresh
          </button>
          <span className="login-note flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-600" /> Session: {sessionId.slice(0, 10)}...
          </span>
        </div>
      </div>

      {liveEvent && (
        <div className="mb-4 p-3 bg-emerald-600 text-white rounded-lg shadow-sm text-xs font-medium flex items-center justify-between animate-fadeIn">
          <span>⚡ Live Update: {liveEvent}</span>
          <button onClick={() => setLiveEvent(null)} className="text-white/80 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-stone-500 bg-white rounded-xl border border-stone-200">
          Loading your incident history...
        </div>
      ) : reports.length === 0 ? (
        <div className="empty-state clay-panel">
          <Clock3 size={28} />
          <h2>No reports filed under this session yet</h2>
          <p>When you file an emergency report or pledge resources, you can track real-time dispatch progress right here.</p>
          <Link href="/citizen" className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm">
            File an Emergency Report <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            // Coordinate parsing
            let repLat = report.lat;
            let repLng = report.lng;
            if ((repLat === undefined || repLng === undefined) && report.location_wkt) {
              const match = report.location_wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
              if (match) {
                repLng = parseFloat(match[1]);
                repLat = parseFloat(match[2]);
              }
            }

            // Find nearest shelter
            let nearestShelterItem: ResourceItem | null = null;
            let nearestShelterDist = Infinity;
            if (repLat !== undefined && repLng !== undefined && !isNaN(repLat) && !isNaN(repLng)) {
              for (const res of resources) {
                if (res.type !== "shelter") continue;
                let resLat = res.lat;
                let resLng = res.lng;
                if ((resLat === undefined || resLng === undefined) && res.location_wkt) {
                  const match = res.location_wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
                  if (match) {
                    resLng = parseFloat(match[1]);
                    resLat = parseFloat(match[2]);
                  }
                }
                if (resLat === undefined || resLng === undefined || isNaN(resLat) || isNaN(resLng)) continue;
                const dist = getDistance(repLat!, repLng!, resLat, resLng);
                if (dist < nearestShelterDist) {
                  nearestShelterDist = dist;
                  nearestShelterItem = res;
                }
              }
            }

            // Find nearest dispatched team for ETA
            const assignedTeam = report.status === "in_progress" && repLat !== undefined && repLng !== undefined && !isNaN(repLat) && !isNaN(repLng)
              ? (rescuers.find(r => r.assignedReportId === report.id) || rescuers.find(r => r.status === "en_route"))
              : null;

            let dispatchETA: { callsign: string; type: string; distance: number; eta: number; gpsActive: boolean } | null = null;
            if (assignedTeam && assignedTeam.lat !== undefined && assignedTeam.lng !== undefined && !isNaN(assignedTeam.lat) && !isNaN(assignedTeam.lng)) {
              const dist = getDistance(repLat!, repLng!, assignedTeam.lat, assignedTeam.lng);
              
              // Simulate: GPS loss if status is resting or offline keywords exist
              const gpsActive = assignedTeam.status !== "resting" && !assignedTeam.callsign.toLowerCase().includes("offline");
              const speed = gpsActive ? 42 : 32; // 42 km/h live vs 32 km/h average local speed
              const eta = Math.round((dist / speed) * 60) || 1;
              dispatchETA = { callsign: assignedTeam.callsign, type: assignedTeam.type, distance: dist, eta, gpsActive };
            }

            return (
              <div 
                key={report.id} 
                className={`p-5 rounded-xl border transition-all ${
                  report.status === "resolved" 
                    ? "bg-green-50/70 border-green-300" 
                    : report.status === "in_progress"
                    ? "bg-blue-50/70 border-blue-300 shadow-sm"
                    : report.status === "verified"
                    ? "bg-emerald-50/70 border-emerald-300"
                    : "bg-white border-stone-200 shadow-2xs"
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-white border border-stone-200 shadow-2xs">
                      {getDisasterIcon(report.type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-stone-900 capitalize flex items-center gap-2">
                        {report.type} Incident
                        <span className="font-mono text-[11px] font-normal text-stone-500">#{report.id.slice(0, 8)}</span>
                      </h3>
                      <p className="text-xs text-stone-500 flex items-center gap-1">
                        <MapPin size={12} /> {report.location_wkt || "GPS Location"} · Filed on {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div>{getStatusBadge(report.status)}</div>
                </div>

                {report.description && (
                  <div className="mt-3 text-xs text-stone-700 bg-white/70 p-3 rounded-lg border border-stone-200">
                    {report.description}
                  </div>
                )}

                {/* Closest Shelter & Rescuer ETA panels */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {nearestShelterItem && (
                    <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between shadow-3xs">
                      <span className="text-stone-600 font-semibold">📍 Nearest Camp:</span>
                      <span className="font-bold text-stone-800">{nearestShelterItem.name} ({nearestShelterDist.toFixed(1)} km)</span>
                    </div>
                  )}
                  {dispatchETA && (
                    <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg flex flex-col gap-1 shadow-3xs">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-600 font-semibold">🚒 Dispatched:</span>
                        <span className="font-bold text-stone-800">{dispatchETA.callsign} ({dispatchETA.distance.toFixed(1)} km)</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-blue-200/50">
                        <span className="text-stone-500 font-medium">Estimated Arrival:</span>
                        <span className="font-extrabold text-blue-700">~{dispatchETA.eta} mins</span>
                      </div>
                      <div className="text-[10px] text-right font-semibold mt-0.5">
                        {dispatchETA.gpsActive ? (
                          <span className="text-emerald-700">📶 GPS Live: Active Tracker (42 km/h)</span>
                        ) : (
                          <span className="text-amber-700">⚠️ GPS Lost: Estimating using road avg (32 km/h)</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Live tracking map specific to this citizen report */}
                {repLat !== undefined && repLng !== undefined && !isNaN(repLat) && !isNaN(repLng) && (nearestShelterItem || assignedTeam) && (
                  <CitizenTrackingMap
                    reportLat={repLat}
                    reportLng={repLng}
                    reportType={report.type}
                    rescuerLat={assignedTeam?.lat}
                    rescuerLng={assignedTeam?.lng}
                    rescuerName={assignedTeam?.callsign}
                    rescuerType={assignedTeam?.type}
                    shelterLat={nearestShelterItem ? (nearestShelterItem.lat !== undefined ? nearestShelterItem.lat : parseFloat(nearestShelterItem.location_wkt?.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i)?.[2] || "0")) : undefined}
                    shelterLng={nearestShelterItem ? (nearestShelterItem.lng !== undefined ? nearestShelterItem.lng : parseFloat(nearestShelterItem.location_wkt?.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i)?.[1] || "0")) : undefined}
                    shelterName={nearestShelterItem?.name}
                  />
                )}

              {/* Action Toolbar */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleShare(report.id)}
                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Share2 size={12} /> 
                  {copiedId === report.id ? "✓ Copied Link!" : "Share \"I'm Safe\" Link"}
                </button>
              </div>

              {/* Step indicator */}
              <div className="mt-4 pt-3 border-t border-stone-200/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-stone-500">
                  <span className="text-emerald-700 font-semibold">1. Report Submitted</span>
                  <span className={report.status !== "unverified" ? "text-emerald-700 font-semibold" : ""}>
                    2. Clustered & Verified
                  </span>
                  <span className={report.status === "in_progress" || report.status === "resolved" ? "text-blue-700 font-semibold" : ""}>
                    3. Rescue Dispatched
                  </span>
                  <span className={report.status === "resolved" ? "text-green-700 font-bold" : ""}>
                    4. Incident Resolved
                  </span>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </CitizenShell>
  );
}