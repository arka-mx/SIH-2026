"use client";

import { FormEvent, useState, useEffect } from "react";
import { ArrowRight, Truck, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/components/public/PublicHeader";

const TRANSLATIONS = {
  English: {
    kicker: "Field operations portal",
    heading: "Active Rescuer Dispatch.",
    subheading: "Access your unit tracking dashboard, supplies list, and automated emergency routing.",
    title: "Rescuer Access",
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
    title: "बचावकर्ता प्रवेश",
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
    title: "উদ্ধারকারী অ্যাক্সেস",
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
    title: "ଉଦ୍ଧାରକାରୀ ପ୍ରବେଶ",
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
    title: "రెస్క్యూయర్ యాక్సెస్",
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
  const [rescuerId, setRescuerId] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_RESCUER_ID || "demo-team-alpha"
  );
  const [password, setPassword] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_RESCUER_PASSWORD || "rescuer123"
  );
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/rescuer-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rescuerId, password })
      });

      if (res.ok) {
        router.push(`/rescuer/${encodeURIComponent(rescuerId.trim())}`);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || t.error);
      }
    } catch (err) {
      console.error("Rescuer login failed:", err);
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
        <form className="access-form" onSubmit={handleSubmit}>
          <div className="form-icon rescuer-icon bg-emerald-700 flex items-center justify-center text-white rounded-xl">
            <Truck size={24} />
          </div>
          <h2>{t.title}</h2>

          {error && (
            <div className="error-summary flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <label htmlFor="rescuer-id">
            {t.teamId}
            <input
              id="rescuer-id"
              name="rescuerId"
              required
              value={rescuerId}
              onChange={(e) => setRescuerId(e.target.value)}
              placeholder="e.g. demo-team-alpha"
              className="mt-1"
            />
          </label>

          <label htmlFor="rescuer-password">
            {t.password}
            <input
              id="rescuer-password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1"
            />
          </label>

          <button 
            className="form-submit bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-1.5" 
            type="submit"
            disabled={loading}
          >
            {loading ? t.loading : t.submit} <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}
