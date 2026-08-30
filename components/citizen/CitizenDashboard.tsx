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
} from "lucide-react";
import Link from "next/link";
import { 
  apiSubmitReport, 
  apiReverseGeocode, 
  apiReverseGeocodeDetailed,
  apiGetIncidentById, 
  apiGetActiveReportForSession,
  apiPublishSafeShare,
  ReportItem
} from "@/lib/api";
import { getOrCreateDeviceId } from "@/lib/device";
import { CitizenLiveTrackingMap } from "@/components/citizen/CitizenLiveTrackingMap";
import { WeatherWidget } from "@/components/ui/WeatherWidget";
import { useLanguage } from "@/lib/language";

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

  async function handleShareSafeLink(report: ReportItem) {
    // Prefer the richer report from the feed (coords, address, live status) over
    // the freshly-submitted event, then publish a public snapshot so the link
    // resolves even when the backend is offline.
    let source: ReportItem = report;
    try {
      const active = await apiGetActiveReportForSession(getOrCreateDeviceId());
      if (active) source = active;
    } catch {
      // offline — publish from what we have
    }

    const snapshot = await apiPublishSafeShare(source);
    const shareUrl = `${window.location.origin}/safe/${snapshot.id}`;
    const shareData = {
      title: "My safety status — Momentum",
      text: "I've shared my location and safety status. You can follow it live here:",
      url: shareUrl,
    };

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch (err) {
      // share sheet dismissed — don't fall back to clipboard
      if (err instanceof Error && err.name === "AbortError") return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // clipboard blocked — still show feedback
    }
    setSafeLinkCopied(true);
    setTimeout(() => setSafeLinkCopied(false), 2500);
  }

  // Initialize Immutable Device-Specific Unique ID & check for active report
  useEffect(() => {
    async function initSession() {
      const devId = getOrCreateDeviceId();
      setSessionId(devId);
      const active = await apiGetActiveReportForSession(devId);
      if (active) {
        setActiveExistingReport(active);
        setSubmittedReport(active);
      }
    }
    initSession();
  }, []);

  // Live status polling for citizen emergency report
  useEffect(() => {
    if (!submittedReport) return;

    const interval = setInterval(async () => {
      const fresh = await apiGetIncidentById(submittedReport.id);
      if (fresh) {
        setSubmittedReport(fresh);
        if (fresh.status !== "resolved" && fresh.status !== "cancelled") {
          setActiveExistingReport(fresh);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [submittedReport?.id]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const devId = getOrCreateDeviceId();
      const idempotencyKey = "idemp-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);

      const formData = new FormData();
      formData.append("device_id", devId);
      formData.append("session_id", devId);
      formData.append("idempotency_key", idempotencyKey);
      formData.append("type", disasterType);
      formData.append("lat", lat);
      formData.append("lng", lng);
      formData.append("region", regionName);
      formData.append("address", locationName);

      if (selectedPhoto) {
        formData.append("photo", selectedPhoto);
      }

      const fullDesc = `[${locationName} | Region: ${regionName}] Emergency Request (${disasterType.toUpperCase()}) - Injured: ${injured}, Trapped: ${casualties}, Safe: ${isSafe ? 'Yes' : 'No'}`;
      formData.append("description", fullDesc);

      const response = await apiSubmitReport(formData);
      setSubmittedReport(response.report);
      setActiveExistingReport(response.report);
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit emergency report";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }


  const dispatched = Boolean(submittedReport?.assigned_rescuer);
  const trackModifier = dispatched
    ? "cz-track--dispatched"
    : submittedReport?.status === "verified"
    ? "cz-track--verified"
    : "";

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t.desk}</p>
          <h1>{t.title}</h1>
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
                  <h3>Report active</h3>
                  {dispatched ? (
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
                  Incident <code>{submittedReport.id}</code> · Session{" "}
                  <code>{submittedReport.session_id}</code>
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
              </div>
            </div>
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
                <span>Session {sessionId.slice(0, 14)}…</span>
              </div>
              <button type="button" className="cz-modal__close" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="cz-modal__body">
              {activeExistingReport ? (
                <>
                  <div className="adm-note">
                    <AlertTriangle size={16} />
                    <span>
                      A report (<strong>{activeExistingReport.id}</strong>) is already active for this
                      device. Only one report can run at a time.
                    </span>
                  </div>
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
    </>
  );
}