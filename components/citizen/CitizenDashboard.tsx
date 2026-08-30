"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { 
  AlertTriangle, 
  HeartPulse, 
  MapPin, 
  Send, 
  UsersRound, 
  Navigation, 
  Camera, 
  CheckCircle2, 
  RotateCcw,
  Sparkles,
  ShieldCheck,
  X,
  Radio,
  Zap,
  PhoneCall,
  Clock
} from "lucide-react";
import Link from "next/link";
import { 
  apiSubmitReport, 
  apiReverseGeocode, 
  apiGetIncidentById, 
  apiGetActiveReportForSession,
  ReportItem 
} from "@/lib/api";
import { fetchIpBasedSessionId, createNewSessionId } from "@/lib/session";
import { CitizenLiveTrackingMap } from "@/components/citizen/CitizenLiveTrackingMap";

export function CitizenDashboard() {
  const [sessionId, setSessionId] = useState<string>("");
  const [lat, setLat] = useState<string>("19.0760");
  const [lng, setLng] = useState<string>("72.8777");
  const [locationName, setLocationName] = useState<string>("Mumbai Coastal Sector");
  const [disasterType, setDisasterType] = useState<string>("flood");
  
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [submittedReport, setSubmittedReport] = useState<ReportItem | null>(null);
  const [activeExistingReport, setActiveExistingReport] = useState<ReportItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize IP-based session ID & check for active report
  useEffect(() => {
    async function initSession() {
      const ipSession = await fetchIpBasedSessionId();
      setSessionId(ipSession);
      const active = await apiGetActiveReportForSession(ipSession);
      if (active) {
        setActiveExistingReport(active);
        setSubmittedReport(active);
      }
    }
    initSession();
  }, []);

  function handleNewSession() {
    const newId = createNewSessionId();
    setSessionId(newId);
    setSubmittedReport(null);
    setActiveExistingReport(null);
  }

  // Live status polling for citizen emergency report
  useEffect(() => {
    if (!submittedReport) return;

    const interval = setInterval(async () => {
      const fresh = await apiGetIncidentById(submittedReport.id);
      if (fresh) {
        setSubmittedReport(fresh);
        if (fresh.status !== "resolved") {
          setActiveExistingReport(fresh);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [submittedReport?.id]);

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
          const address = await apiReverseGeocode(latitude, longitude);
          setLocationName(address);
        } catch {
          setLocationName(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
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
          const address = await apiReverseGeocode(fallbackLat, fallbackLng);
          setLocationName(address);
        } catch {
          setLocationName("Mumbai Coastal Sector (Auto-detected)");
        }
        setGpsLoading(false);
      },
      { timeout: 8000 }
    );
  }

  function handleSetPreset(name: string, pLat: string, pLng: string) {
    setLocationName(name);
    setLat(pLat);
    setLng(pLng);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    // Enforce 1 active emergency per IP Session ID
    const activeCheck = await apiGetActiveReportForSession(sessionId);
    if (activeCheck && activeCheck.status !== "resolved") {
      setActiveExistingReport(activeCheck);
      setSubmittedReport(activeCheck);
      setError("An active emergency request is already registered under your IP session. You can track your assigned rescuers below.");
      setLoading(false);
      setIsModalOpen(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("session_id", sessionId);
      formData.append("type", disasterType);
      formData.append("lat", lat);
      formData.append("lng", lng);

      const fullDesc = `[${locationName}] Emergency Request (${disasterType.toUpperCase()})`;
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

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Zero-Login Emergency Response Desk</p>
          <h1>Disaster Assistance & SOS Radar</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="login-note flex items-center gap-1.5 border border-emerald-300 bg-emerald-50/80 px-3 py-1 rounded-xl">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span className="text-xs font-bold text-emerald-950">Unique IP Session:</span>
            <code className="text-xs bg-white text-emerald-900 px-2 py-0.5 rounded font-mono font-extrabold border border-emerald-200">{sessionId}</code>
            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">Locked to IP</span>
          </span>
        </div>
      </div>

      {/* Main Action Hub */}
      <div className="citizen-actions mb-6">
        <button 
          type="button" 
          onClick={() => setIsModalOpen(true)}
          className="report-action active flex items-center justify-between p-6 bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-red-400 group cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
              <AlertTriangle size={32} className="text-white animate-bounce" />
            </div>
            <div className="text-left">
              <span className="text-xs uppercase font-bold tracking-wider text-rose-100 bg-white/10 px-2.5 py-0.5 rounded-full">
                Zero-Login Instant Request
              </span>
              <h2 className="text-xl font-extrabold text-white mt-1">Report an Emergency (SOS Window)</h2>
              <p className="text-xs text-rose-100">Click to open quick SOS window — Auto-location & disaster type</p>
            </div>
          </div>
          <span className="px-4 py-2 bg-white text-rose-700 font-extrabold text-xs rounded-xl shadow-md group-hover:bg-rose-50 transition-colors whitespace-nowrap">
            Open Emergency Window →
          </span>
        </button>

        <Link href="/citizen/volunteer" className="volunteer-action flex items-center justify-between p-6 bg-white border border-stone-200 hover:border-emerald-500 rounded-2xl shadow-xs transition-all">
          <div className="flex items-center gap-3">
            <UsersRound size={26} className="text-emerald-600" />
            <div>
              <strong className="text-stone-900 text-sm font-bold block">Pledge Community Resource</strong>
              <span className="text-xs text-stone-500">Offer boats, vehicles, shelter space, or volunteer time</span>
            </div>
          </div>
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-300 bg-red-50 text-red-900 text-sm flex items-center gap-2 shadow-xs">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submitted Report Live Tracking Dashboard */}
      {submittedReport && (
        <div className="space-y-4 mb-6">
          <div className={`p-5 rounded-2xl border shadow-md transition-all ${
            submittedReport.assigned_rescuer
              ? "bg-gradient-to-r from-emerald-900 to-slate-900 text-white border-emerald-500"
              : submittedReport.status === "verified"
              ? "bg-gradient-to-r from-blue-900 to-slate-900 text-white border-blue-500" 
              : "bg-gradient-to-r from-amber-900 to-slate-900 text-white border-amber-500"
          }`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <CheckCircle2 className={submittedReport.assigned_rescuer ? "text-emerald-400" : "text-amber-400"} size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base text-white">
                      Active Emergency SOS Request Transmitted
                    </h3>
                    {submittedReport.assigned_rescuer ? (
                      <span className="bg-emerald-500 text-white text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                        <Sparkles size={12} /> Rescuer Dispatched
                      </span>
                    ) : (
                      <span className="bg-amber-500 text-slate-950 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                        Awaiting Admin Review / Nearest Fallback
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-300 mt-1">
                    Incident ID: <strong className="font-mono text-white">{submittedReport.id}</strong> · Session: <strong className="font-mono text-amber-300">{submittedReport.session_id}</strong>
                  </p>
                  <p className="text-xs text-emerald-200 mt-1 font-medium">
                    {submittedReport.assigned_rescuer
                      ? `✓ Rescuer ${submittedReport.assigned_rescuer.name} (${submittedReport.assigned_rescuer.callsign}) is moving toward your coordinates!`
                      : "⏳ Request is live on the Admin Dispatch Desk. If admin approves, rescuers are assigned; if admin denies, nearest rescuers auto-route!"}
                  </p>
                </div>
              </div>

              <Link 
                href="/citizen/history" 
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold px-3.5 py-2 rounded-xl backdrop-blur-md shadow-2xs whitespace-nowrap"
              >
                View History →
              </Link>
            </div>
          </div>

          {/* Citizen Live Tracking Map with Polling */}
          <CitizenLiveTrackingMap incident={submittedReport} onIncidentUpdated={setSubmittedReport} />
        </div>
      )}

      {/* ── EMERGENCY REPORTING WINDOW (MODAL POPUP) ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <HeartPulse size={24} className="text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">Emergency SOS Window</h3>
                  <span className="text-xs text-rose-100 flex items-center gap-1">
                    <ShieldCheck size={12} /> IP Session: <code className="font-mono bg-white/10 px-1.5 py-0.2 rounded">{sessionId}</code>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {activeExistingReport ? (
                <div className="p-4 bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl text-xs space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                    <AlertTriangle size={18} className="text-amber-600" />
                    Active Emergency Request Already Registered!
                  </div>
                  <p>
                    An active emergency request (ID: <strong className="font-mono">{activeExistingReport.id}</strong>) is currently active for your IP session ID. 
                  </p>
                  <p>
                    To prevent system overload, citizens cannot submit duplicate requests while an active request is being processed.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs text-xs"
                  >
                    Close Window & Track Assigned Rescuer
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Location Selector (Select Current Location Button) */}
                  <div className="p-4 bg-emerald-50/90 rounded-2xl border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                        <MapPin size={15} className="text-emerald-600" /> Emergency Location
                      </label>
                      <button
                        type="button"
                        onClick={handleDetectGPS}
                        disabled={gpsLoading}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Navigation size={13} className={gpsLoading ? "animate-spin" : ""} />
                        {gpsLoading ? "Resolving GPS Address..." : "Select Current Location"}
                      </button>
                    </div>

                    <div className="input-with-icon bg-white rounded-xl border border-stone-300">
                      <MapPin size={16} className="text-stone-400" />
                      <input 
                        name="location" 
                        required 
                        placeholder="Location address (Auto-filled by Select Current Location)"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        className="w-full py-2 text-xs font-semibold text-stone-800 focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-500 font-mono">
                      <span>Lat: <strong>{lat}</strong></span>
                      <span>Lng: <strong>{lng}</strong></span>
                    </div>
                  </div>

                  {/* Disaster Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-stone-800 block">
                      Type of Disaster / Emergency
                    </label>
                    <select 
                      name="disaster" 
                      value={disasterType} 
                      onChange={(e) => setDisasterType(e.target.value)}
                      className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    >
                      <option value="flood">🌊 Flood / Water Inundation</option>
                      <option value="cyclone">🌪️ Cyclone / Wind Damage</option>
                      <option value="landslide">⛰️ Landslide / Debris Collapse</option>
                      <option value="medical">🚑 Medical Emergency / Ambulance Need</option>
                      <option value="fire">🔥 Fire / Structural Trap</option>
                      <option value="other">⚠️ Other Incident</option>
                    </select>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-1/3 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-2/3 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Send size={15} />
                      {loading ? "Transmitting SOS..." : "Transmit Immediate Emergency SOS"}
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