"use client";

import { FormEvent, useState, useEffect } from "react";
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
  Globe,
  Truck,
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/components/public/PublicHeader";
import { apiReverseGeocode } from "@/lib/api";
import { saveRescuerSession, RescuerUserSession } from "@/lib/rescuerAuth";

const TRANSLATIONS = {
  English: {
    kicker: "Field operations portal",
    heading: "Active Rescuer Dispatch.",
    subheading: "Access your unit tracking dashboard, supplies list, and automated emergency routing.",
    title: "Rescuer Access Portal",
    teamId: "Rescuer Unit ID / Callsign",
    password: "Password",
    submit: "Enter Field Portal",
    loading: "Verifying...",
    error: "Invalid rescuer credentials"
  },
  Hindi: {
    kicker: "क्षेत्र संचालन पोर्टल",
    heading: "सक्रिय बचाव दल प्रेषण।",
    subheading: "अपने इकाई ट्रैकिंग डैशबोर्ड, आपूर्ति सूची और स्वचालित आपातकालीन रूटिंग तक पहुंचें।",
    title: "बचावकर्ता प्रवेश पोर्टल",
    teamId: "बचाव दल आईडी / कॉलसाइन",
    password: "पासवर्ड",
    submit: "फील्ड पोर्टल में प्रवेश करें",
    loading: "सत्यापित किया जा रहा है...",
    error: "अमान्य बचावकर्ता क्रेडेंशियल"
  },
  Bengali: {
    kicker: "ফিল্ড অপারেশন পোর্টাল",
    heading: "সক্রিয় উদ্ধারকারী প্রেরণ।",
    subheading: "আপনার ইউনিট ট্র্যাকিং ড্যাশবোর্ড, সরবরাহ তালিকা এবং স্বয়ংক্রিয় জরুরি রুট অ্যাক্সেস করুন।",
    title: "উদ্ধারকারী অ্যাক্সেস পোর্টাল",
    teamId: "উদ্ধারকারী ইউনিট আইডি / কলসাইন",
    password: "পাসওয়ার্ড",
    submit: "ফিল্ড পোর্টালে প্রবেশ করুন",
    loading: "যাচাই করা হচ্ছে...",
    error: "অকার্যকর উদ্ধারকারী শংসাপত্র"
  },
  Odia: {
    kicker: "ଫିଲ୍ଡ କାର୍ଯ୍ୟକ୍ଷେତ୍ର ପୋର୍ଟାଲ",
    heading: "ସକ୍ରିୟ ଉଦ୍ଧାରକାରୀ ପ୍ରେରଣ।",
    subheading: "ଆପଣଙ୍କର ୟୁନିଟ୍ ଟ୍ରାକିଂ ଡ୍ୟାସବୋର୍ଡ, ସାମଗ୍ରୀ ତାଲିକା ଏବଂ ସ୍ୱୟଂକ୍ରିୟ ଜରୁରୀକାଳୀନ ରୁଟିଂ ପ୍ରବେଶ କରନ୍ତୁ।",
    title: "ଉଦ୍ଧାରକାରୀ ପ୍ରବେଶ ପୋର୍ଟାଲ",
    teamId: "ଉଦ୍ଧାରକାରୀ ୟୁନିଟ୍ ଆଇଡି / କଲ୍ ସାଇନ୍",
    password: "ପାସୱାର୍ଡ",
    submit: "ଫିଲ୍ଡ ପୋର୍ଟାଲରେ ପ୍ରବେଶ କରନ୍ତୁ",
    loading: "ଯାଞ୍ଚ କରାଯାଉଛି...",
    error: "ଅବୈଧ ଉଦ୍ଧାରକାରୀ ପ୍ରମାଣପତ୍ର"
  },
  Telugu: {
    kicker: "ఫీల్డ్ కార్యకలాపాల పోర్టల్",
    heading: "సక్రియ రెస్క్యూయర్ పంపడం.",
    subheading: "మీ యూనిట్ ట్రాకింగ్ డ్యాష్‌బోర్డ్, సామాగ్రి జాబితా మరియు స్వయంచాలక అత్యవసర రూటింగ్‌ను యాక్సెస్ చేయండి.",
    title: "రెస్క్యూయర్ యాక్సెస్ పోర్టల్",
    teamId: "రెస్క్యూయర్ యూనిట్ ఐడి / కాల్‌సైన్",
    password: "పాసవర్డ్",
    submit: "ఫీల్డ్ పోర్టల్‌లోకి ప్రవేశించండి",
    loading: "ధృవీకరిస్తోంది...",
    error: "చెల్లని రెస్క్యూయర్ ఆధారాలు"
  }
};

type SupportedLang = "English" | "Hindi" | "Bengali" | "Odia" | "Telugu";

export default function RescuerLoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<SupportedLang>("English");

  // Auth & Profile fields
  const [googleEmail, setGoogleEmail] = useState("commander.verma@ndrf.gov.in");
  const [googleName, setGoogleName] = useState("Captain Rajesh Verma");
  const [isTeamHead, setIsTeamHead] = useState<boolean>(true);
  const [rescuerId, setRescuerId] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_RESCUER_ID || "demo-team-alpha"
  );
  const [password, setPassword] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_RESCUER_PASSWORD || "rescuer123"
  );

  // Office Location fields
  const [officeName, setOfficeName] = useState("Brahmapur Regional Disaster Command");
  const [officeLat, setOfficeLat] = useState<number>(19.315);
  const [officeLng, setOfficeLng] = useState<number>(84.794);
  const [regionRadius, setRegionRadius] = useState<number>(25);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [authStep, setAuthStep] = useState<"google" | "profile">("google");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("momentum_language");
    if (stored === "Hindi" || stored === "hi") {
      setLang("Hindi");
    } else if (stored === "Bengali" || stored === "bn") {
      setLang("Bengali");
    } else if (stored === "Odia" || stored === "or") {
      setLang("Odia");
    } else if (stored === "Telugu" || stored === "te") {
      setLang("Telugu");
    } else {
      setLang("English");
    }
  }, []);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.English;

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

  async function handleCompleteSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
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
      const targetId = rescuerId.trim() || "demo-team-alpha";
      router.push(`/rescuer/${encodeURIComponent(targetId)}`);
      router.refresh();
    } catch (err) {
      console.error("Rescuer setup failed:", err);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="public-home">
      <PublicHeader />
      <section className="access-form-layout">
        <div>
          <p className="hero-kicker">{t.kicker}</p>
          <h1>{t.heading}</h1>
          <p>{t.subheading}</p>
        </div>

        <div className="w-full max-w-lg bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl font-extrabold text-white">{t.title}</h2>
            <p className="text-xs text-stone-300">
              Google Authentication, Team Leadership Role & Regional Office Base Setup
            </p>
          </div>

          {error && (
            <div className="error-summary flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-semibold rounded-xl">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: GOOGLE AUTHENTICATION */}
          {authStep === "google" && (
            <form onSubmit={handleGoogleLoginSimulate} className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                <label className="block text-xs font-bold text-stone-300">
                  {t.teamId}
                  <input
                    type="text"
                    required
                    value={rescuerId}
                    onChange={(e) => setRescuerId(e.target.value)}
                    placeholder="e.g. demo-team-alpha"
                    className="mt-1 w-full p-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
                  />
                </label>

                <label className="block text-xs font-bold text-stone-300">Google Account Email</label>
                <input
                  type="email"
                  required
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full p-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
                />

                <label className="block text-xs font-bold text-stone-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full p-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-white text-stone-900 font-extrabold text-xs rounded-xl shadow-lg hover:bg-stone-100 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
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
            <form onSubmit={handleCompleteSetup} className="space-y-4">
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
                    className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/30 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
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
                  disabled={loading}
                  className="w-2/3 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {loading ? t.loading : t.submit} <ArrowRight size={14} />
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
