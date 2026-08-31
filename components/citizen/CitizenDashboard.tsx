"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import {
  AlertTriangle,
  MapPin,
  Send,
  HandHeart,
  Navigation,
  CheckCircle2,
  X,
  Share2,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { 
  apiSubmitReport, 
  apiReverseGeocode, 
  apiReverseGeocodeDetailed,
  apiGetIncidentById, 
  apiGetActiveReportForSession,
  apiGetActiveVolunteerPledgeForDevice,
  apiCancelVolunteerPledge,
  apiPublishSafeShare,
  apiCancelSos,
  ReportItem
} from "@/lib/api";
import { VolunteerPledge } from "@/types/rescuer";
import { getOrCreateDeviceId } from "@/lib/device";
import {
  getCitizenProfile,
  getCachedActiveReport,
  cacheActiveReport,
} from "@/lib/citizenSession";
import { shareOrCopyLink } from "@/lib/shareLink";
import { CitizenLiveTrackingMap } from "@/components/citizen/CitizenLiveTrackingMap";
import { WeatherWidget } from "@/components/ui/WeatherWidget";
import { useLanguage } from "@/lib/language";

/** Minimum wait between re-sending an SOS for the same active report. */
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

export function CitizenDashboard() {
  const { t: translate } = useLanguage();
  const t = new Proxy({} as Record<string, string>, {
    get: (_, prop: string) => translate(prop),
  });

  const [sessionId, setSessionId] = useState<string>("");
  const [lat, setLat] = useState<string>("19.0760");
  const [lng, setLng] = useState<string>("72.8777");
  const [locationName, setLocationName] = useState<string>("Mumbai Coastal Sector");
  const [regionName, setRegionName] = useState<string>("Mumbai, Maharashtra");
  const [disasterType, setDisasterType] = useState<string>("flood");
  const [helpNeeded, setHelpNeeded] = useState<string>("Rescue team");
  const [injured, setInjured] = useState<string>("0");
  const [casualties, setCasualties] = useState<string>("0");
  const [isSafe, setIsSafe] = useState<boolean>(false);
  const [citizenName, setCitizenName] = useState<string>("");

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [submittedReport, setSubmittedReport] = useState<ReportItem | null>(null);
  const [activeExistingReport, setActiveExistingReport] = useState<ReportItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [safeLinkCopied, setSafeLinkCopied] = useState<boolean>(false);
  const [safeShareUrl, setSafeShareUrl] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [sosAborted, setSosAborted] = useState<boolean>(false);

  // "Resend SOS" cooldown: timestamp (ms) of the last SOS the citizen pushed for
  // the active report, plus a 1s ticker so the countdown label stays live.
  const [lastSosAt, setLastSosAt] = useState<number>(0);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const [resending, setResending] = useState<boolean>(false);

  const resendMsLeft = lastSosAt ? Math.max(0, lastSosAt + RESEND_COOLDOWN_MS - nowTs) : 0;
  const canResend = lastSosAt > 0 && resendMsLeft === 0;

  const [activePledge, setActivePledge] = useState<VolunteerPledge | null>(null);
  const [cancellingPledge, setCancellingPledge] = useState<boolean>(false);

  /** Mark the active report cancelled everywhere and drop it from the citizen view. */
  function abortActiveReportLocally(cancelledReport: ReportItem) {
    const cancelled = { ...cancelledReport, status: "cancelled" as const };
    cacheActiveReport(cancelled); // status === "cancelled" clears the snapshot
    setSubmittedReport(cancelled);
    setActiveExistingReport(null);
    setLastSosAt(0);
    setSosAborted(true);
  }

  async function handleCancelSos() {
    const report = submittedReport || activeExistingReport;
    if (!report || cancelling) return;
    if (typeof window !== "undefined" && !window.confirm(t.cancelConfirm)) return;

    setCancelling(true);
    setError(null);
    try {
      await apiCancelSos(getOrCreateDeviceId(), { source: "citizen_cancel" });
      abortActiveReportLocally(report);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not cancel the SOS. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleCancelPledge() {
    if (!activePledge || cancellingPledge) return;
    setCancellingPledge(true);
    try {
      await apiCancelVolunteerPledge(activePledge.id);
      setActivePledge(null);
    } catch (err) {
      setError("Could not cancel volunteer pledge.");
    } finally {
      setCancellingPledge(false);
    }
  }

  async function handleShareSafeLink(report: ReportItem) {
    setError(null);

    // Sharing an "I'm safe" check-in means the emergency is over: abort the SOS
    // so it stops routing to the admin and the rescue team head.
    apiCancelSos(getOrCreateDeviceId(), { source: "citizen_safe" })
      .then(() => abortActiveReportLocally(report))
      .catch(() => {
        /* keep the report visible if the cancel call failed */
      });

    // The snapshot id is always the report id, so the shareable URL is known up
    // front. Show it immediately as a reliable fallback/confirmation.
    const shareUrl = `${window.location.origin}/safe/${report.id}`;
    setSafeShareUrl(shareUrl);

    // Publish the public snapshot in the background. Do NOT await it before
    // shareOrCopyLink(): the browser drops the click's user-activation across an
    // await, which makes navigator.share (and sometimes the clipboard) fail.
    const safeReport: ReportItem = {
      ...report,
      status: "cancelled",
      description: `${report.description || ""} | Safe: Yes`.trim(),
    };
    const publishing = apiPublishSafeShare(safeReport).catch((err: unknown) => {
      setError(
        err instanceof Error
          ? `${err.message} — the link above may take a moment to open.`
          : "The safe link may not open yet. Try Share again in a moment."
      );
    });

    const outcome = await shareOrCopyLink({
      title: "My safety status — Sanket",
      text: "I've shared my location and safety status. You can follow it live here:",
      url: shareUrl,
    });

    if (outcome === "copied") {
      setSafeLinkCopied(true);
      setTimeout(() => setSafeLinkCopied(false), 2500);
    }

    await publishing;
  }

  // Initialize Immutable Device-Specific Unique ID & check for active report
  useEffect(() => {
    async function initSession() {
      const devId = getOrCreateDeviceId();

      const profile = getCitizenProfile();
      if (profile?.name) setCitizenName(profile.name);

      // Restore the last-known active report instantly from local cache so a
      // refresh never drops "help is on the way" while the network is checked.
      const cached = getCachedActiveReport();
      if (cached) {
        setActiveExistingReport(cached);
        setSubmittedReport(cached);
        setLastSosAt(new Date(cached.updated_at || cached.created_at).getTime() || Date.now());
      }

      try {
        const [active, pledge] = await Promise.all([
          apiGetActiveReportForSession(devId),
          apiGetActiveVolunteerPledgeForDevice(devId),
        ]);
        setActivePledge(pledge);

        if (active) {
          // Server is source of truth when it has the report.
          cacheActiveReport(active);
          setActiveExistingReport(active);
          setSubmittedReport(active);
          setLastSosAt(new Date(active.updated_at || active.created_at).getTime() || Date.now());
        } else if (!cached) {
          // No local snapshot and server has nothing — genuinely no report.
          setActiveExistingReport(null);
        }
        // If the server returns nothing but we have a cached snapshot, keep it:
        // the in-memory server store is wiped on restart, the citizen's report
        // is not. Polling will clear it once it resolves.
      } catch {
        // offline — the cached snapshot is the best we have
      }
    }
    initSession();
  }, []);

  // Live status polling for citizen emergency report
  useEffect(() => {
    if (!submittedReport) return;

    const interval = setInterval(async () => {
      // By-id first; after a refresh the id may have drifted to the server's
      // incident id, so fall back to "the active report for this device".
      let fresh = await apiGetIncidentById(submittedReport.id);
      if (!fresh) {
        const devId = getOrCreateDeviceId();
        fresh = await apiGetActiveReportForSession(devId);
      }
      if (fresh) {
        setSubmittedReport(fresh);
        cacheActiveReport(fresh); // clears the snapshot once resolved/cancelled
        if (fresh.status !== "resolved" && fresh.status !== "cancelled") {
          setActiveExistingReport(fresh);
        } else {
          setActiveExistingReport(null);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [submittedReport?.id]);

  // Keep the "Resend SOS" countdown ticking while a report is active and cooling down.
  useEffect(() => {
    if (!submittedReport || canResend) return;
    const tick = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [submittedReport?.id, canResend]);

  // Auto-detect current location when the report modal opens
  const gpsAutoRequestedRef = useRef(false);
  useEffect(() => {
    if (isModalOpen && !gpsAutoRequestedRef.current) {
      gpsAutoRequestedRef.current = true;
      handleDetectGPS();
    }
    if (!isModalOpen) {
      gpsAutoRequestedRef.current = false;
    }
  }, [isModalOpen]);

  async function handleDetectGPS() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setGpsLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setLat(latitude.toFixed(6));
        setLng(longitude.toFixed(6));
        
        try {
          const detail = await apiReverseGeocodeDetailed(latitude, longitude);
          setLocationName(detail.displayName);
          setRegionName(detail.region);
        } catch {
          setLocationName(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          setRegionName(`Sector (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`);
        }
        setGpsLoading(false);
      },
      async (err) => {
        console.warn("GPS detection error or fallback:", err);
        const fallbackLat = 19.0760;
        const fallbackLng = 72.8777;
        setLat(fallbackLat.toFixed(6));
        setLng(fallbackLng.toFixed(6));
        try {
          const detail = await apiReverseGeocodeDetailed(fallbackLat, fallbackLng);
          setLocationName(detail.displayName);
          setRegionName(detail.region);
        } catch {
          setLocationName("Mumbai Coastal Sector (Auto-detected)");
          setRegionName("Mumbai, Maharashtra");
        }
        setGpsLoading(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10000 }
    );
  }

  function handleSetPreset(name: string, pLat: string, pLng: string) {
    setLocationName(name);
    setLat(pLat);
    setLng(pLng);
    setRegionName(name.split("(")[0].trim());
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  function buildReportFormData(opts?: { message?: string; includePhoto?: boolean }) {
    const devId = getOrCreateDeviceId();
    const formData = new FormData();
    formData.append("device_id", devId);
    formData.append("session_id", devId);
    formData.append("idempotency_key", "idemp-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6));
    if (citizenName) formData.append("reporter_name", citizenName);
    formData.append("type", disasterType);
    formData.append("lat", lat);
    formData.append("lng", lng);
    formData.append("region", regionName);
    formData.append("address", locationName);
    if (opts?.includePhoto !== false && selectedPhoto) {
      formData.append("photo", selectedPhoto);
    }
    formData.append(
      "description",
      `[${locationName} | Region: ${regionName}] Emergency Request (${disasterType.toUpperCase()}) - Injured: ${injured}, Trapped: ${casualties}, Safe: ${isSafe ? "Yes" : "No"}`
    );
    if (opts?.message) formData.append("message", opts.message);
    return formData;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiSubmitReport(buildReportFormData());
      setSubmittedReport(response.report);
      setActiveExistingReport(response.report);
      cacheActiveReport(response.report);
      setLastSosAt(Date.now());
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit emergency report";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // Push a fresh SOS on the existing active report. The backend appends a new
  // report event, refreshes the location and timestamp, and bumps report_count
  // (which feeds trust clustering) — signalling the situation is still ongoing.
  async function handleResendSos() {
    if (!canResend || resending) return;
    setResending(true);
    setError(null);
    try {
      const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const response = await apiSubmitReport(
        buildReportFormData({ message: `SOS re-sent at ${stamp} — situation still ongoing`, includePhoto: false })
      );
      setSubmittedReport(response.report);
      setActiveExistingReport(response.report);
      cacheActiveReport(response.report);
      setLastSosAt(Date.now());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not re-send the SOS. Please try again.");
    } finally {
      setResending(false);
    }
  }

  const dispatched = Boolean(submittedReport?.assigned_rescuer);
  const reportOpen =
    !!submittedReport && submittedReport.status !== "resolved" && submittedReport.status !== "cancelled";
  const resendCountdown = (() => {
    const total = Math.ceil(resendMsLeft / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  })();
  const trackModifier = dispatched
    ? "cz-track--dispatched"
    : submittedReport?.status === "verified"
    ? "cz-track--verified"
    : "";

  return (
    <div data-no-translate style={{ display: "contents" }}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t.desk}</p>
          <h1>{t.title}</h1>
          {citizenName && (
            <p className="login-note" style={{ marginTop: 4 }}>
              Reporting as <strong>{citizenName}</strong>
            </p>
          )}
        </div>
        <WeatherWidget lat={parseFloat(lat) || 19.0760} lng={parseFloat(lng) || 72.8777} />
      </div>

      <div className="cz-actions">
        <button type="button" onClick={() => setIsModalOpen(true)} className="cz-hero">
          <div className="flex items-center gap-4">
            <span className="cz-hero__icon">
              <AlertTriangle size={22} />
            </span>
            <div>
              <span className="cz-hero__eyebrow">No sign-in needed</span>
              <h2>Report an emergency</h2>
              <p>Auto location and disaster type. Sent straight to dispatch.</p>
            </div>
          </div>
          <span className="cz-hero__cta">Open →</span>
        </button>

        <Link href="/citizen/volunteer" className="cz-hero cz-hero--secondary">
          <div className="flex items-center gap-4">
            <span className="cz-hero__icon">
              <HandHeart size={22} />
            </span>
            <div>
              <span className="cz-hero__eyebrow">Community pool</span>
              <h2>Pledge a resource</h2>
              <p>Boats, vehicles, shelter space, or your time.</p>
            </div>
          </div>
          <span className="cz-hero__cta">Add →</span>
        </Link>
      </div>

      {/* Active Volunteer Pledge Card */}
      {activePledge && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg space-y-3 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <span className="eyebrow text-emerald-800">Active Volunteer Resource Pledge</span>
              <h3 className="font-bold text-base text-emerald-950 mt-0.5">
                {activePledge.assetType} ({activePledge.capacity})
              </h3>
              <p className="text-xs text-emerald-700 mt-1">
                Pledged by <strong>{activePledge.volunteerName}</strong> ({activePledge.contactPhone}) at {activePledge.locationName}.
              </p>
            </div>
            <span
              className={`adm-status text-xs font-bold ${
                activePledge.status === "mobilized"
                  ? "adm-status--green"
                  : activePledge.status === "approved_by_head"
                  ? "adm-status--blue"
                  : activePledge.status === "assigned_by_admin"
                  ? "adm-status--amber"
                  : "adm-status--mute"
              }`}
            >
              {activePledge.status === "mobilized"
                ? "⚡ Mobilized to Scene"
                : activePledge.status === "approved_by_head"
                ? "✓ Approved by Rescue Team Head"
                : activePledge.status === "assigned_by_admin"
                ? "👑 Assigned to Rescue Team Head"
                : "⏳ Awaiting Command Match"}
            </span>
          </div>

          {/* Assigned Rescue Team Banner */}
          {activePledge.assignedTeamName && (
            <div className="p-3 bg-purple-100 border border-purple-300 rounded text-xs text-purple-950 font-medium">
              <span className="font-bold flex items-center gap-1.5 text-purple-900 mb-0.5">
                <Crown size={14} className="text-amber-600" /> Assigned Rescue Team Base:
              </span>
              <p className="font-bold text-sm text-purple-950">{activePledge.assignedTeamName}</p>
              <p className="text-[11px] text-purple-800 mt-1">
                The Rescue Team Head has received your pledge &amp; direct phone ({activePledge.contactPhone}) for local deployment.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
            <span className="text-[11px] text-emerald-800">
              Need to cancel your pledge before mobilization?
            </span>
            <button
              type="button"
              onClick={handleCancelPledge}
              disabled={cancellingPledge}
              className="adm-btn adm-btn--danger text-xs font-bold"
            >
              <X size={13} />
              {cancellingPledge ? "Cancelling..." : "Cancel Volunteer Pledge"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="adm-note" style={{ borderLeftColor: "var(--c-red)", marginBottom: 16 }}>
          <AlertTriangle size={16} style={{ color: "var(--c-red)" }} />
          <span>{error}</span>
        </div>
      )}

      {submittedReport && (
        <div style={{ marginBottom: 24 }}>
          <div className={`cz-track ${trackModifier}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3>{submittedReport.status === "cancelled" ? "Report cancelled" : "Report active"}</h3>
                  {submittedReport.status === "cancelled" ? (
                    <span className="adm-status adm-status--mute">Cancelled</span>
                  ) : dispatched ? (
                    <span className="adm-status adm-status--green">
                      <CheckCircle2 size={11} /> Rescuer dispatched
                    </span>
                  ) : submittedReport.status === "verified" ? (
                    <span className="adm-status adm-status--blue">Verified</span>
                  ) : (
                    <span className="adm-status adm-status--amber">Awaiting review</span>
                  )}
                </div>
                <p>
                  Reference <code>{submittedReport.id}</code>
                </p>
                <p>
                  {dispatched && submittedReport.assigned_rescuer
                    ? `${submittedReport.assigned_rescuer.name} (${submittedReport.assigned_rescuer.callsign}) is en route to your location.`
                    : "On the dispatch map. If review is delayed, the nearest available rescuer is auto-routed."}
                </p>
                <div className="cz-steps">
                  <span className="done">Submitted</span>
                  <span className={submittedReport.status !== "unverified" ? "done" : ""}>Verified</span>
                  <span className={dispatched ? "active" : ""}>Dispatched</span>
                  <span className={submittedReport.status === "resolved" ? "done" : ""}>Resolved</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {reportOpen &&
                  (canResend ? (
                    <button
                      type="button"
                      onClick={handleResendSos}
                      disabled={resending}
                      className="adm-btn adm-btn--danger"
                    >
                      <Send size={13} />
                      {resending ? "Re-sending…" : "Resend SOS"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="adm-btn"
                      title="You can re-send an SOS 5 minutes after the last one"
                    >
                      <Send size={13} />
                      Resend in {resendCountdown}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => handleShareSafeLink(submittedReport)}
                  className="adm-btn"
                >
                  <Share2 size={13} />
                  {safeLinkCopied ? "Link copied" : "Share “I’m safe” link"}
                </button>
                <Link href="/citizen/history" className="adm-btn">
                  Status →
                </Link>
                {reportOpen && (
                  <button
                    type="button"
                    onClick={handleCancelSos}
                    disabled={cancelling}
                    className="adm-btn adm-btn--danger"
                  >
                    <X size={13} />
                    {cancelling ? t.cancelling : t.cancelSos}
                  </button>
                )}
              </div>
            </div>

            {sosAborted && (
              <div className="adm-note" style={{ marginTop: 14, borderLeftColor: "var(--c-green)" }}>
                <CheckCircle2 size={14} /> <span>{t.sosAborted}</span>
              </div>
            )}

            {safeShareUrl && (
              <div
                className="adm-note"
                style={{ marginTop: 14, flexDirection: "column", alignItems: "stretch", gap: 8 }}
              >
                <span style={{ fontWeight: 600 }}>
                  {safeLinkCopied ? "Link copied — share it with family:" : "Your safe check-in link:"}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    readOnly
                    value={safeShareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    style={{
                      flex: 1,
                      minWidth: 220,
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 12,
                      padding: "8px 10px",
                      border: "1px solid var(--c-line, #d5dbe3)",
                      background: "#fff",
                      color: "var(--c-ink, #0f1b2d)",
                    }}
                  />
                  <button
                    type="button"
                    className="adm-btn"
                    onClick={async () => {
                      const ok = await shareOrCopyLink({ url: safeShareUrl });
                      if (ok !== "manual") {
                        setSafeLinkCopied(true);
                        setTimeout(() => setSafeLinkCopied(false), 2500);
                      }
                    }}
                  >
                    <Share2 size={13} /> Copy
                  </button>
                  <a href={safeShareUrl} target="_blank" rel="noopener noreferrer" className="adm-btn">
                    Open ↗
                  </a>
                </div>
              </div>
            )}
          </div>
          <CitizenLiveTrackingMap incident={submittedReport} onIncidentUpdated={setSubmittedReport} />
        </div>
      )}

      {isModalOpen && (
        <div className="cz-modal" onClick={() => setIsModalOpen(false)}>
          <div className="cz-modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="cz-modal__head">
              <div>
                <h3>Report an emergency</h3>
                <span>Your live location is used to route the nearest responder.</span>
              </div>
              <button type="button" className="cz-modal__close" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="cz-modal__body">
              {activePledge ? (
                <>
                  <div className="adm-note" style={{ borderLeftColor: "var(--c-amber)" }}>
                    <AlertTriangle size={16} className="text-amber-600" />
                    <span>
                      You currently have an active Volunteer Resource Pledge (<strong>{activePledge.assetType}</strong>). A citizen cannot report an emergency SOS and pledge resources at the same time.
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await handleCancelPledge();
                      }}
                      disabled={cancellingPledge}
                      className="adm-btn adm-btn--danger"
                      style={{ justifyContent: "center" }}
                    >
                      <X size={14} />
                      {cancellingPledge ? "Cancelling pledge..." : "Cancel Volunteer Pledge & Report SOS"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="adm-btn"
                      style={{ justifyContent: "center" }}
                    >
                      Keep Active Pledge
                    </button>
                  </div>
                </>
              ) : activeExistingReport ? (
                <>
                  <div className="adm-note">
                    <AlertTriangle size={16} />
                    <span>
                      A report (<strong>{activeExistingReport.id}</strong>) is already active for this
                      device. Only one report can run at a time — use{" "}
                      <strong>Resend SOS</strong> on the report card if your situation is still ongoing.
                    </span>
                  </div>
                  {reportOpen && canResend && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        handleResendSos();
                      }}
                      disabled={resending}
                      className="adm-btn adm-btn--danger"
                      style={{ justifyContent: "center" }}
                    >
                      <Send size={13} />
                      {resending ? "Re-sending…" : "Resend SOS now"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="adm-btn adm-btn--primary"
                    style={{ justifyContent: "center" }}
                  >
                    Track current report
                  </button>
                </>
              ) : (
                <form onSubmit={handleSubmit} className="cz-modal__body" style={{ padding: 0 }}>
                  <label className="adm-field">
                    <span>
                      <MapPin size={13} /> Location
                    </span>
                    <input
                      name="location"
                      required
                      placeholder="Address or landmark"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleDetectGPS}
                      disabled={gpsLoading}
                      className="adm-btn"
                      style={{ marginTop: 10, width: "100%", justifyContent: "center" }}
                    >
                      <Navigation size={13} />
                      {gpsLoading ? "Detecting…" : "Use current location"}
                    </button>
                  </label>

                  <div className="adm-kv">
                    <span>Region</span>
                    <strong>{regionName}</strong>
                  </div>
                  <div className="adm-kv">
                    <span>Coordinates</span>
                    <strong style={{ fontFamily: "ui-monospace, monospace" }}>
                      {lat}, {lng}
                    </strong>
                  </div>

                  <label className="adm-field">
                    <span>Type</span>
                    <select
                      name="disaster"
                      value={disasterType}
                      onChange={(e) => setDisasterType(e.target.value)}
                    >
                      <option value="flood">{t.flood}</option>
                      <option value="cyclone">{t.cyclone}</option>
                      <option value="landslide">{t.landslide}</option>
                      <option value="medical">{t.medical}</option>
                      <option value="fire">{t.fire}</option>
                      <option value="other">{t.other}</option>
                    </select>
                  </label>

                  <div className="cz-modal__actions">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="adm-btn">
                      Cancel
                    </button>
                    <button type="submit" disabled={loading} className="adm-btn adm-btn--danger">
                      <Send size={14} />
                      {loading ? "Sending…" : "Send report"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}