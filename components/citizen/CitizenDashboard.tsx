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
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { apiSubmitReport, ReportItem } from "@/lib/api";
import { getOrCreateSessionId, createNewSessionId } from "@/lib/session";

export function CitizenDashboard() {
  const [sessionId, setSessionId] = useState<string>("");
  const [lat, setLat] = useState<string>("19.0760");
  const [lng, setLng] = useState<string>("72.8777");
  const [locationName, setLocationName] = useState<string>("Mumbai Coastal Sector");
  const [disasterType, setDisasterType] = useState<string>("flood");
  const [description, setDescription] = useState<string>("");
  const [injured, setInjured] = useState<string>("0");
  const [casualties, setCasualties] = useState<string>("0");
  const [helpNeeded, setHelpNeeded] = useState<string>("Rescue team");
  const [isSafe, setIsSafe] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [submittedReport, setSubmittedReport] = useState<ReportItem | null>(null);
  const [verifiedCluster, setVerifiedCluster] = useState<ReportItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  function handleNewSession() {
    const newId = createNewSessionId();
    setSessionId(newId);
    setSubmittedReport(null);
    setVerifiedCluster(null);
  }

  function handleDetectGPS() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setGpsLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocationName(`Current GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        setGpsLoading(false);
      },
      (err) => {
        console.warn("GPS detection error:", err);
        setError("Could not retrieve GPS coordinates. Using preset location.");
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

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSubmittedReport(null);
    setVerifiedCluster(null);

    try {
      const formData = new FormData();
      formData.append("session_id", sessionId);
      formData.append("type", disasterType);
      formData.append("lat", lat);
      formData.append("lng", lng);

      const fullDesc = `[${locationName}] ${description ? description + " - " : ""}Injured: ${injured}, Casualties: ${casualties}, Help needed: ${helpNeeded}${isSafe ? " (Reporter marked safe)" : ""}`;
      formData.append("description", fullDesc.slice(0, 500));

      if (selectedPhoto) {
        formData.append("photo", selectedPhoto);
      }

      const response = await apiSubmitReport(formData);
      setSubmittedReport(response.report);
      if (response.verifiedReports && response.verifiedReports.length > 0) {
        setVerifiedCluster(response.verifiedReports);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit report";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Citizen Response Desk</p>
          <h1>Report an Emergency</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="login-note flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            Session: <code className="text-xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-mono">{sessionId.slice(0, 16)}...</code>
          </span>
          <button 
            type="button" 
            onClick={handleNewSession}
            className="text-xs text-stone-600 hover:text-emerald-700 bg-white border border-stone-200 hover:border-emerald-500 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm transition-all"
            title="Simulate a new independent citizen reporter"
          >
            <RotateCcw size={12} /> New Reporter ID
          </button>
        </div>
      </div>

      {submittedReport && (
        <div className={`mb-6 p-5 rounded-xl border shadow-sm transition-all ${
          submittedReport.status === "verified" || (verifiedCluster && verifiedCluster.length >= 3)
            ? "bg-emerald-50/90 border-emerald-300 text-emerald-950" 
            : "bg-amber-50/90 border-amber-300 text-amber-950"
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <CheckCircle2 className={submittedReport.status === "verified" ? "text-emerald-600 mt-0.5" : "text-amber-600 mt-0.5"} size={24} />
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  Emergency Report Filed Successfully!
                  {submittedReport.status === "verified" || (verifiedCluster && verifiedCluster.length >= 3) ? (
                    <span className="bg-emerald-600 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <Sparkles size={12} /> Auto-Verified (3+ Reports)
                    </span>
                  ) : (
                    <span className="bg-amber-500 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold">
                      Unverified Pin (Awaiting 2 More Reports)
                    </span>
                  )}
                </h3>
                <p className="text-xs mt-1 opacity-90">
                  Incident ID: <strong className="font-mono">{submittedReport.id}</strong> · Location: <strong>{lat}, {lng}</strong> ({disasterType.toUpperCase()})
                </p>
                <p className="text-xs mt-1">
                  {submittedReport.status === "verified" || (verifiedCluster && verifiedCluster.length >= 3)
                    ? "✓ Trust layer clustered 3+ distinct reports nearby. Incident is escalated for authority dispatch shortlist."
                    : "⏳ Report is live on the dispatch map. Once 3 distinct sessions report within 200m & 15 mins, confidence auto-escalates."}
                </p>
              </div>
            </div>
            <Link 
              href="/citizen/history" 
              className="bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold px-3 py-2 rounded-lg shadow-sm whitespace-nowrap"
            >
              Track in My Reports →
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-300 bg-red-50 text-red-900 text-sm flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="citizen-actions">
        <button type="button" className="report-action active">
          <AlertTriangle size={28} />
          <strong>Report an Emergency</strong>
          <span>Send critical details directly to the response map</span>
        </button>
        <Link href="/citizen/volunteer" className="volunteer-action">
          <UsersRound size={24} />
          <strong>Pledge Community Resource</strong>
          <span>Offer boats, vehicles, shelter space, or volunteer time</span>
        </Link>
      </div>

      <form className="citizen-form clay-panel" onSubmit={handleSubmit}>
        <div className="form-section-heading">
          <div>
            <p className="eyebrow">Zero-Login Emergency Dispatch</p>
            <h2 className="section-title">What is the situation?</h2>
          </div>
          <HeartPulse size={22} className="text-rose-600" />
        </div>

        {/* Demo Quick Coordinate Helpers */}
        <div className="mb-4 p-3 bg-stone-50/80 rounded-lg border border-stone-200">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="font-semibold text-stone-700 flex items-center gap-1">
              <MapPin size={14} className="text-emerald-600" /> Demo Quick Coordinate Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button 
                type="button" 
                onClick={() => handleSetPreset("Mumbai Coastal Zone", "19.0760", "72.8777")}
                className="px-2 py-1 bg-white border border-stone-300 hover:border-emerald-500 rounded text-[11px] font-medium shadow-2xs"
              >
                Mumbai Flood Zone (19.076, 72.877)
              </button>
              <button 
                type="button" 
                onClick={() => handleSetPreset("Brahmapur Hub", "19.3151", "84.7941")}
                className="px-2 py-1 bg-white border border-stone-300 hover:border-emerald-500 rounded text-[11px] font-medium shadow-2xs"
              >
                Brahmapur District (19.315, 84.794)
              </button>
              <button 
                type="button" 
                onClick={handleDetectGPS}
                disabled={gpsLoading}
                className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 rounded text-[11px] font-medium flex items-center gap-1"
              >
                <Navigation size={11} /> {gpsLoading ? "Detecting GPS..." : "Detect Device GPS"}
              </button>
            </div>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Location Name / Landmark
            <div className="input-with-icon">
              <MapPin size={16} />
              <input 
                name="location" 
                required 
                placeholder="e.g. Near New Bus Stand / Bridge"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label>
              Latitude
              <input 
                name="lat" 
                required 
                type="number" 
                step="any"
                placeholder="19.0760" 
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </label>
            <label>
              Longitude
              <input 
                name="lng" 
                required 
                type="number" 
                step="any"
                placeholder="72.8777" 
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </label>
          </div>

          <label>
            Type of Disaster
            <select 
              name="disaster" 
              value={disasterType} 
              onChange={(e) => setDisasterType(e.target.value)}
            >
              <option value="flood">Flood</option>
              <option value="cyclone">Cyclone</option>
              <option value="landslide">Landslide</option>
              <option value="medical">Medical Emergency</option>
              <option value="fire">Fire</option>
              <option value="other">Other Incident</option>
            </select>
          </label>

          <label>
            Immediate Help Needed
            <select 
              name="help" 
              value={helpNeeded}
              onChange={(e) => setHelpNeeded(e.target.value)}
            >
              <option value="Rescue team">Rescue Team / Evacuation</option>
              <option value="Boat">Inflatable Boat / Water Rescue</option>
              <option value="Medical assistance">Medical Ambulance & Doctors</option>
              <option value="Shelter">Emergency Shelter / Camp</option>
              <option value="Food and water">Food & Clean Drinking Water</option>
            </select>
          </label>

          <label>
            People Injured
            <input 
              name="injured" 
              type="number" 
              min="0" 
              placeholder="0"
              value={injured}
              onChange={(e) => setInjured(e.target.value)}
            />
          </label>

          <label>
            Casualties / Trapped
            <input 
              name="casualties" 
              type="number" 
              min="0" 
              placeholder="0"
              value={casualties}
              onChange={(e) => setCasualties(e.target.value)}
            />
          </label>

          <div className="col-span-full">
            <label>
              Photo Evidence (Optional)
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-lg p-3 text-center cursor-pointer bg-stone-50/50 hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-2"
              >
                <Camera size={18} className="text-stone-500" />
                <span className="text-xs text-stone-600 font-medium">
                  {selectedPhoto ? selectedPhoto.name : "Click to upload photo or take picture on camera"}
                </span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </label>
            {photoPreview && (
              <div className="mt-2 relative inline-block">
                <img src={photoPreview} alt="Upload preview" className="w-24 h-24 object-cover rounded-md border border-stone-300" />
                <button 
                  type="button" 
                  onClick={() => { setSelectedPhoto(null); setPhotoPreview(null); }}
                  className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="form-footer">
          <label className="safe-check flex items-center gap-2 cursor-pointer text-xs text-stone-700">
            <input 
              name="safe" 
              type="checkbox" 
              checked={isSafe} 
              onChange={(e) => setIsSafe(e.target.checked)} 
            /> 
            I am currently in a safe location
          </label>
          <button 
            className="form-submit report-submit flex items-center justify-center gap-2" 
            type="submit"
            disabled={loading}
          >
            <Send size={16} /> 
            {loading ? "Transmitting GPS Report..." : "Submit Emergency Report"}
          </button>
        </div>
      </form>
    </>
  );
}