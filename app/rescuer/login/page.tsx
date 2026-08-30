"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  MapPin, 
  Navigation, 
  Award, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Radio, 
  Lock,
  Globe
} from "lucide-react";
import { apiReverseGeocode } from "@/lib/api";
import { saveRescuerSession, RescuerUserSession } from "@/lib/rescuerAuth";

export default function RescuerLoginPage() {
  const router = useRouter();

  // Auth fields
  const [googleEmail, setGoogleEmail] = useState("commander.verma@ndrf.gov.in");
  const [googleName, setGoogleName] = useState("Captain Rajesh Verma");
  const [isTeamHead, setIsTeamHead] = useState<boolean>(true);

  // Office Location fields
  const [officeName, setOfficeName] = useState("Brahmapur Regional Disaster Command");
  const [officeLat, setOfficeLat] = useState<number>(19.315);
  const [officeLng, setOfficeLng] = useState<number>(84.794);
  const [regionRadius, setRegionRadius] = useState<number>(25);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [authStep, setAuthStep] = useState<"google" | "profile">("google");

  async function handleDetectOfficeGPS() {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setOfficeLat(lat);
        setOfficeLng(lng);
        try {
          const address = await apiReverseGeocode(lat, lng);
          setOfficeName(address);
        } catch {
          setOfficeName(`Office Base (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
        setGpsLoading(false);
      },
      (err) => {
        console.warn("GPS error:", err);
        setGpsLoading(false);
      },
      { timeout: 8000 }
    );
  }

  function handleGoogleLoginSimulate(e: React.FormEvent) {
    e.preventDefault();
    setAuthStep("profile");
  }

  function handleCompleteSetup(e: React.FormEvent) {
    e.preventDefault();
    const session: RescuerUserSession = {
      id: "usr-" + Math.random().toString(36).substring(2, 8),
      email: googleEmail,
      name: googleName,
      isTeamHead,
      officeName,
      officeLat,
      officeLng,
      regionRadiusKm: regionRadius,
      loggedInAt: new Date().toISOString(),
    };

    saveRescuerSession(session);
    router.push("/rescuer/demo-team-alpha");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Rescue Access Portal</h1>
          <p className="text-xs text-stone-300">
            Google Authentication, Team Leadership Role & Regional Office Base Setup
          </p>
        </div>

        {/* STEP 1: GOOGLE AUTHENTICATION */}
        {authStep === "google" && (
          <form onSubmit={handleGoogleLoginSimulate} className="space-y-4 animate-fadeIn">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
              <label className="block text-xs font-bold text-stone-300">Google Account Email</label>
              <input
                type="email"
                required
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
              />

              <label className="block text-xs font-bold text-stone-300">Full Name</label>
              <input
                type="text"
                required
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-white text-stone-900 font-extrabold text-xs rounded-xl shadow-lg hover:bg-stone-100 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {/* Google G SVG */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign in with Google OAuth →
            </button>
          </form>
        )}

        {/* STEP 2: TEAM HEAD ROLE & OFFICE LOCATION SETUP */}
        {authStep === "profile" && (
          <form onSubmit={handleCompleteSetup} className="space-y-4 animate-fadeIn">
            {/* Leadership Role Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-200 block flex items-center gap-1.5">
                <Award size={14} className="text-purple-400" /> Team Leadership Designation
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsTeamHead(true)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    isTeamHead
                      ? "bg-purple-600/30 border-purple-400 text-white font-bold ring-1 ring-purple-400"
                      : "bg-white/5 border-white/10 text-stone-400 hover:bg-white/10"
                  }`}
                >
                  <span className="block font-extrabold text-sm text-purple-300">👑 Team Head / Commander</span>
                  <span className="text-[11px] opacity-80 block mt-0.5">Can set & broadcast resource estimations</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTeamHead(false)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    !isTeamHead
                      ? "bg-emerald-600/30 border-emerald-400 text-white font-bold ring-1 ring-emerald-400"
                      : "bg-white/5 border-white/10 text-stone-400 hover:bg-white/10"
                  }`}
                >
                  <span className="block font-extrabold text-sm text-emerald-300">🛡️ Field Rescuer</span>
                  <span className="text-[11px] opacity-80 block mt-0.5">Executes operations following team head plan</span>
                </button>
              </div>
            </div>

            {/* Office Location & Jurisdiction Radius */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-400" /> Office / Base Location
                </label>
                <button
                  type="button"
                  onClick={handleDetectOfficeGPS}
                  disabled={gpsLoading}
                  className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/30 text-[11px] font-bold rounded-lg flex items-center gap-1"
                >
                  <Navigation size={11} className={gpsLoading ? "animate-spin" : ""} />
                  {gpsLoading ? "Detecting..." : "Select Office Location"}
                </button>
              </div>

              <input
                type="text"
                required
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                placeholder="Office Base Landmark / Address"
                className="w-full p-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
              />

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-stone-400">
                <span>Lat: <b>{officeLat.toFixed(4)}</b></span>
                <span>Lng: <b>{officeLng.toFixed(4)}</b></span>
              </div>

              <div className="pt-1">
                <label className="text-xs font-bold text-stone-300 block mb-1">
                  Jurisdiction Radius (Regional Separation): <b>{regionRadius} km</b>
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={regionRadius}
                  onChange={(e) => setRegionRadius(parseInt(e.target.value) || 25)}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAuthStep("google")}
                className="w-1/3 py-3 bg-white/10 text-stone-300 font-bold text-xs rounded-xl hover:bg-white/20"
              >
                ← Back
              </button>
              <button
                type="submit"
                className="w-2/3 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                Complete Login & Launch Dashboard <ArrowRight size={14} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
