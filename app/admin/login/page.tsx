"use client";

import { FormEvent, useState, useEffect } from "react";
import { ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/components/public/PublicHeader";

const TRANSLATIONS = {
  English: {
    kicker: "Secure operations access",
    heading: "Welcome, coordinator.",
    subheading: "Verify your official credentials to access the emergency dashboard.",
    title: "Admin access",
    username: "Username",
    password: "Password",
    submit: "Open admin dashboard",
    loading: "Authenticating...",
    error: "Invalid coordinator credentials"
  },
  Hindi: {
    kicker: "सुरक्षित संचालन पहुंच",
    heading: "स्वागत है, समन्वयक।",
    subheading: "आपातकालीन डैशबोर्ड तक पहुंचने के लिए अपने आधिकारिक क्रेडेंशियल सत्यापित करें।",
    title: "प्रशासक पहुंच",
    username: "उपयोगकर्ता नाम",
    password: "पासवर्ड",
    submit: "एडमिन डैशबोर्ड खोलें",
    loading: "सत्यापित किया जा रहा है...",
    error: "अमान्य समन्वयक क्रेडेंशियल"
  },
  Bengali: {
    kicker: "সুরক্ষিত অপারেশন অ্যাক্সেস",
    heading: "স্বাগতম, সমন্বয়কারী।",
    subheading: "জরুরি ড্যাশবোর্ড অ্যাক্সেস করতে আপনার অফিসিয়াল শংসাপত্রগুলি যাচাই করুন।",
    title: "অ্যাডমিন অ্যাক্সেস",
    username: "ব্যবহারকারীর নাম",
    password: "পাসওয়ার্ড",
    submit: "অ্যাডমিন ড্যাশবোর্ড খুলুন",
    loading: "প্রমাণীকরণ করা হচ্ছে...",
    error: "অকার্যকর সমন্বয়কারী শংসাপত্র"
  },
  Odia: {
    kicker: "ସୁରକ୍ଷିତ କାର୍ଯ୍ୟକ୍ଷେତ୍ର ପ୍ରବେଶ",
    heading: "ସ୍ୱାଗତ, ସମନ୍ୱୟକାରୀ।",
    subheading: "ଜରୁରୀକାଳୀନ ଡ୍ୟାସବୋର୍ଡ ପ୍ରବେଶ କରିବାକୁ ଆପଣଙ୍କର ସରକାରୀ ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ କରନ୍ତୁ।",
    title: "ଆଡମିନ୍ ପ୍ରବେଶ",
    username: "ଉପଭୋକ୍ତା ନାମ",
    password: "ପାସୱାର୍ଡ",
    submit: "ଆଡମିନ ଡ୍ୟାସବୋର୍ଡ ଖୋଲନ୍ତୁ",
    loading: "ଯାଞ୍ଚ କରାଯାଉଛି...",
    error: "ଅବୈଧ ସମନ୍ୱୟକାରୀ ପ୍ରମାଣପତ୍ର"
  },
  Telugu: {
    kicker: "సురక్షిత కార్యకలాపాల యాక్సెస్",
    heading: "స్వాగతం, సమన్వయకర్త.",
    subheading: "అత్యవసర డ్యాష్‌బోర్డ్‌ను యాక్సెస్ చేయడానికి మీ అధికారిక ఆధారాలను ధృవీకరించండి.",
    title: "అడ్మిన్ యాక్సెస్",
    username: "వినియోగదారు పేరు",
    password: "పాస్‌వర్డ్",
    submit: "అడ్మిన్ డ్యాష్‌బోర్డ్ తెరవండి",
    loading: "ధృవీకరిస్తోంది...",
    error: "చెల్లని సమన్వయకర్త ఆధారాలు"
  }
};

type SupportedLang = "English" | "Hindi" | "Bengali" | "Odia" | "Telugu";

export default function AdminLoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<SupportedLang>("English");
  const [username, setUsername] = useState(process.env.NEXT_PUBLIC_DEFAULT_ADMIN_USERNAME || "admin");
  const [password, setPassword] = useState(process.env.NEXT_PUBLIC_DEFAULT_ADMIN_PASSWORD || "admin123");
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t.error);
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || t.error);
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
          <div className="form-icon">
            <ShieldCheck size={24} />
          </div>
          <h2>{t.title}</h2>

          {error && (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200 flex items-center gap-2 mb-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <label htmlFor="admin-username">
            {t.username}
            <input
              id="admin-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              className="mt-1"
            />
          </label>

          <label htmlFor="admin-password">
            {t.password}
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1"
            />
          </label>

          <button className="form-submit" type="submit" disabled={loading}>
            {loading ? t.loading : t.submit} <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}