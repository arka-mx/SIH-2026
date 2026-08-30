"use client";

import { useEffect, useState } from "react";
import {
  Clock3,
  CheckCircle,
  MapPin,
  Radio,
  RotateCw,
  ArrowRight,
  Flame,
  Waves,
  Wind,
  Mountain,
  HeartPulse,
  Share2,
  X,
} from "lucide-react";
import Link from "next/link";
import { CitizenShell } from "@/components/citizen/CitizenShell";
import {
  apiGetCitizenReports,
  apiGetAllResources,
  apiGetRescuerLocations,
  apiPublishSafeShare,
  apiCancelSos,
  ReportItem,
  ResourceItem
} from "@/lib/api";
import { getOrCreateDeviceId } from "@/lib/device";
import { RescuerUnitProfile } from "@/types/rescuer";
import { getOrCreateSessionId } from "@/lib/session";
import { shareOrCopyLink } from "@/lib/shareLink";
import { getSocket } from "@/lib/socket";
import dynamic from "next/dynamic";

const CitizenTrackingMap = dynamic(
  () => import("@/components/citizen/CitizenTrackingMap").then((mod) => mod.CitizenTrackingMap),
  { ssr: false, loading: () => <div className="h-[180px] bg-slate-50 border border-slate-200 flex items-center justify-center text-xs text-slate-400">Loading map…</div> }
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
  const [shareUrlById, setShareUrlById] = useState<Record<string, string>>({});

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

  async function handleShare(report: ReportItem) {
    // The snapshot id is the report id, so the URL is known before any network
    // call. Publish in the background — awaiting it here would consume the click
    // gesture that navigator.share / clipboard need.
    const shareUrl = `${window.location.origin}/safe/${report.id}`;
    setShareUrlById((prev) => ({ ...prev, [report.id]: shareUrl }));

    // "I'm safe" means the emergency is over — abort any active SOS so it stops
    // routing to the admin and the rescue team head.
    const stillActive = report.status !== "resolved" && report.status !== "cancelled";
    if (stillActive) {
      apiCancelSos(getOrCreateDeviceId(), { source: "citizen_safe" })
        .then(() => {
          setReports((prev) =>
            prev.map((r) =>
              r.status !== "resolved" && r.status !== "cancelled"
                ? { ...r, status: "cancelled" }
                : r
            )
          );
          setLiveEvent("You reported safe — SOS dispatch to the admin and rescue team was stopped.");
        })
        .catch(() => {});
    }

    const safeReport: ReportItem = stillActive
      ? { ...report, status: "cancelled", description: `${report.description || ""} | Safe: Yes`.trim() }
      : report;

    const publishing = apiPublishSafeShare(safeReport).catch((err: unknown) => {
      setLiveEvent(
        err instanceof Error ? err.message : "The safe link may take a moment to open."
      );
    });

    const outcome = await shareOrCopyLink({
      title: "My safety status — Sanket",
      text: "I've shared my location and safety status. You can follow it live here:",
      url: shareUrl,
    });
    if (outcome === "copied") {
      setCopiedId(report.id);
      setTimeout(() => setCopiedId(null), 2500);
    }

    await publishing;
  }

  async function handleCancel(report: ReportItem) {
    if (typeof window !== "undefined" &&
        !window.confirm("Cancel this SOS? Rescue teams and the district admin will stop responding to it.")) {
      return;
    }
    await apiCancelSos(getOrCreateDeviceId(), { source: "citizen_cancel" });
    setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status: "cancelled" } : r)));
    setLiveEvent(`SOS #${report.id.slice(0, 8)} cancelled — dispatch to the admin and rescue team stopped.`);
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
        return <span className="adm-status adm-status--amber">Awaiting reports</span>;
      case "verified":
        return <span className="adm-status adm-status--blue">Verified</span>;
      case "in_progress":
        return (
          <span className="adm-status adm-status--blue">
            <CheckCircle size={11} /> Dispatched
          </span>
        );
      case "resolved":
        return (
          <span className="adm-status adm-status--green">
            <CheckCircle size={11} /> Resolved
          </span>
        );
      case "cancelled":
        return <span className="adm-status adm-status--mute">Cancelled</span>;
      default:
        return <span className="adm-status adm-status--mute">{status}</span>;
    }
  }

  return (
    <CitizenShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Report tracking</p>
          <h1>Status</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadReports(sessionId)} className="adm-btn">
            <RotateCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {liveEvent && (
        <div className="adm-note" style={{ borderLeftColor: "var(--c-green)", marginBottom: 16, justifyContent: "space-between", alignItems: "center" }}>
          <span>{liveEvent}</span>
          <button onClick={() => setLiveEvent(null)} className="adm-btn" style={{ padding: "4px 8px" }}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="adm-card" style={{ textAlign: "center", color: "var(--c-ink-mute)", fontSize: 13 }}>
          Loading…
        </div>
      ) : reports.length === 0 ? (
        <div className="empty-state adm-card">
          <Clock3 size={26} />
          <h2>No reports yet</h2>
          <p>File an emergency report or pledge a resource to track dispatch progress here.</p>
          <Link href="/citizen" className="adm-btn adm-btn--primary" style={{ marginTop: 12 }}>
            Report an emergency <ArrowRight size={14} />
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
                className="adm-card"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor:
                    report.status === "resolved"
                      ? "var(--c-green)"
                      : report.status === "in_progress"
                      ? "var(--c-blue)"
                      : report.status === "verified"
                      ? "var(--c-blue)"
                      : "var(--c-amber)",
                }}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="border border-slate-200 p-1.5 text-slate-600">
                      {getDisasterIcon(report.type)}
                    </span>
                    <div>
                      <h3 className="section-title capitalize flex items-center gap-2">
                        {report.type}
                        <span className="font-mono text-[11px] font-normal text-slate-400">
                          #{report.id.slice(0, 8)}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} />{" "}
                        {report.address ||
                          (repLat !== undefined && repLng !== undefined && !isNaN(repLat) && !isNaN(repLng)
                            ? `${repLat.toFixed(4)}, ${repLng.toFixed(4)}`
                            : "GPS location")}{" "}
                        ·{" "}
                        {new Date(report.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div>{getStatusBadge(report.status)}</div>
                </div>

                {report.description && (
                  <div className="mt-3 text-xs text-slate-700 bg-slate-50 p-3 border border-slate-200">
                    {report.description}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {nearestShelterItem && (
                    <div className="adm-kv">
                      <span>Nearest shelter</span>
                      <strong>
                        {nearestShelterItem.name} · {nearestShelterDist.toFixed(1)} km
                      </strong>
                    </div>
                  )}
                  {dispatchETA && (
                    <div className="adm-kv" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
                      <div className="flex items-center justify-between">
                        <span>Dispatched</span>
                        <strong>
                          {dispatchETA.callsign} · {dispatchETA.distance.toFixed(1)} km
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>ETA</span>
                        <strong>~{dispatchETA.eta} min</strong>
                      </div>
                      <span className={`adm-status ${dispatchETA.gpsActive ? "adm-status--green" : "adm-status--amber"}`} style={{ alignSelf: "flex-start" }}>
                        {dispatchETA.gpsActive ? "GPS live" : "GPS lost · road avg"}
                      </span>
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

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button type="button" onClick={() => handleShare(report)} className="adm-btn">
                  <Share2 size={12} />
                  {copiedId === report.id ? "Link copied" : "Share “I’m safe” link"}
                </button>
                {report.status !== "resolved" && report.status !== "cancelled" && (
                  <button
                    type="button"
                    onClick={() => handleCancel(report)}
                    className="adm-btn adm-btn--danger"
                  >
                    <X size={12} /> Cancel SOS
                  </button>
                )}
              </div>

              {shareUrlById[report.id] && (
                <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                  <input
                    readOnly
                    value={shareUrlById[report.id]}
                    onFocus={(e) => e.currentTarget.select()}
                    style={{
                      flex: 1,
                      minWidth: 200,
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 11,
                      padding: "7px 9px",
                      border: "1px solid #d5dbe3",
                      background: "#fff",
                    }}
                  />
                  <a
                    href={shareUrlById[report.id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="adm-btn"
                  >
                    Open ↗
                  </a>
                </div>
              )}

              <div className="cz-steps">
                  <span className="done">Submitted</span>
                  <span className={report.status !== "unverified" ? "done" : ""}>
                    Verified
                  </span>
                  <span className={report.status === "in_progress" || report.status === "resolved" ? "active" : ""}>
                    Dispatched
                  </span>
                  <span className={report.status === "resolved" ? "done" : ""}>
                    Resolved
                  </span>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </CitizenShell>
  );
}