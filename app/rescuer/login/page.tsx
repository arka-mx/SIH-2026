"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "@/lib/language";
import {
  ShieldCheck,
  Navigation,
  Crown,
  HardHat,
  ArrowRight,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { BackButton } from "@/components/public/BackButton";
import { apiReverseGeocode } from "@/lib/api";
import { auth, googleProvider } from "@/lib/firebase";

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
  const { name: lang } = useLanguage();

  // Google identity (populated by Firebase sign-in)
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  // Profile fields
  const [isTeamHead, setIsTeamHead] = useState<boolean>(true);
  const rescuerId = process.env.NEXT_PUBLIC_DEFAULT_RESCUER_ID || "demo-team-alpha";

  // Office Location fields
  const [officeName, setOfficeName] = useState("Brahmapur Regional Disaster Command");
  const [officeLat, setOfficeLat] = useState<number>(19.315);
  const [officeLng, setOfficeLng] = useState<number>(84.794);
  const [regionRadius, setRegionRadius] = useState<number>(25);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [authStep, setAuthStep] = useState<"google" | "profile">("google");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const t = TRANSLATIONS[lang as SupportedLang] || TRANSLATIONS.English;

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

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      setGoogleEmail(user.email ?? "");
      setGoogleName(user.displayName ?? "");
      setPhotoUrl(user.photoURL ?? "");
      setAuthStep("profile");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // user dismissed the popup — nothing to report
      } else {
        console.error("Google sign-in failed:", err);
        setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleCompleteSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setError("Your Google session expired. Please sign in again.");
        setAuthStep("google");
        return;
      }

      const res = await fetch("/api/auth/rescuer-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          rescuerId: rescuerId.trim(),
          isTeamHead,
          officeName,
          officeLat,
          officeLng,
          regionRadiusKm: regionRadius,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.error);

      router.push(data.redirect || `/rescuer/${encodeURIComponent(rescuerId.trim() || "demo-team-alpha")}`);
      router.refresh();
    } catch (err) {
      console.error("Rescuer setup failed:", err);
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="public-home theme-light">
      <BackButton />
      <section className="access-form-layout">
        <div className="w-full bg-white border border-[#c8d1dc] border-t-[3px] border-t-[#c2410c] p-6 sm:p-8 shadow-[0_1px_2px_rgba(15,27,45,0.06),0_14px_30px_-12px_rgba(15,27,45,0.18)] space-y-5">
          {/* Header */}
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center w-11 h-11 bg-[#115e59] text-white">
              <ShieldCheck size={22} />
            </div>
            <div className="pb-4 border-b border-[#dde3ea]">
              <h2 className="text-xl font-bold text-[#0f1b2d]">{t.title}</h2>
              <p className="text-xs text-[#64748b] mt-1">
                Google authentication, team leadership role &amp; regional office base setup
              </p>
            </div>
          </div>

          {error && (
            <div className="error-summary flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: GOOGLE AUTHENTICATION */}
          {authStep === "google" && (
            <div className="space-y-4">
              <p className="text-xs text-[#64748b] leading-relaxed">
                Sign in with your official Google account to continue to team &amp; base setup.
              </p>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full py-3 bg-white border border-[#c8d1dc] text-[#0f1b2d] font-extrabold text-xs hover:bg-[#eef2f6] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
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
                {googleLoading ? "Opening Google…" : "Sign in with Google"}
              </button>
            </div>
          )}

          {/* STEP 2: TEAM ROLE & BASE SETUP */}
          {authStep === "profile" && (
            <form onSubmit={handleCompleteSetup} className="space-y-5">
              {/* signed-in identity */}
              <div className="flex items-center gap-3 pb-4 border-b border-[#dde3ea]">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="" className="w-9 h-9 rounded-full" />
                ) : (
                  <span className="grid place-items-center w-9 h-9 rounded-full bg-[#115e59] text-white text-sm font-bold">
                    {(googleName || googleEmail || "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-[#0f1b2d] truncate">{googleName || "Signed in"}</span>
                  <span className="block text-xs text-[#64748b] truncate">{googleEmail}</span>
                </span>
              </div>

              {/* role */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-[#475569]">Team leadership designation</span>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { head: true, Icon: Crown, label: "Team Head", desc: "Sets and broadcasts resource estimates" },
                    { head: false, Icon: HardHat, label: "Field Rescuer", desc: "Executes the team head's plan" },
                  ] as const).map(({ head, Icon, label, desc }) => {
                    const selected = isTeamHead === head;
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setIsTeamHead(head)}
                        className={`flex flex-col gap-1.5 p-3 border text-left transition-colors ${
                          selected
                            ? "border-[#115e59] bg-[#115e59]/5"
                            : "border-[#dde3ea] hover:border-[#c8d1dc]"
                        }`}
                      >
                        <Icon size={18} className={selected ? "text-[#115e59]" : "text-[#94a3b8]"} />
                        <span className={`text-sm font-bold ${selected ? "text-[#0f1b2d]" : "text-[#475569]"}`}>
                          {label}
                        </span>
                        <span className="text-[11px] leading-snug text-[#64748b]">{desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* office / base location */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="office-name" className="text-xs font-bold text-[#475569]">
                    Office / base location
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectOfficeGPS}
                    disabled={gpsLoading}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#115e59] hover:text-[#0d4b47] disabled:opacity-60 cursor-pointer"
                  >
                    <Navigation size={12} className={gpsLoading ? "animate-spin" : ""} />
                    {gpsLoading ? "Detecting…" : "Use current location"}
                  </button>
                </div>
                <input
                  id="office-name"
                  type="text"
                  required
                  value={officeName}
                  onChange={(e) => setOfficeName(e.target.value)}
                  placeholder="Landmark or address"
                  className="w-full p-2.5 bg-white border border-[#cbd5e1] text-xs font-semibold text-[#0f1b2d] focus:border-[#c2410c] focus:outline-hidden"
                />
                <p className="text-[11px] font-mono text-[#94a3b8]">
                  {officeLat.toFixed(4)}, {officeLng.toFixed(4)}
                </p>
              </div>

              {/* jurisdiction radius */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="radius" className="text-xs font-bold text-[#475569]">
                    Jurisdiction radius
                  </label>
                  <span className="text-xs font-bold text-[#115e59]">{regionRadius} km</span>
                </div>
                <input
                  id="radius"
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={regionRadius}
                  onChange={(e) => setRegionRadius(parseInt(e.target.value) || 25)}
                  className="w-full accent-[#115e59] cursor-pointer"
                />
              </div>

              {/* actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthStep("google")}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-white border border-[#c8d1dc] text-[#475569] font-bold text-xs hover:bg-[#eef2f6] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 bg-[#c2410c] hover:bg-[#9a3412] text-white font-extrabold text-xs transition-colors disabled:opacity-60 cursor-pointer"
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
