"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Languages, ShieldCheck, UsersRound, Truck } from "lucide-react";

const TRANSLATIONS = {
  English: {
    heroKicker: "Community Response Network",
    title: "Disaster Response Command Center",
    subtitle: "Report emergencies, coordinate rescue units & field supplies, and keep your district connected when every second matters.",
    languageLabel: "Preferred language",
    eyebrow: "Choose your workspace",
    workspaceHeading: "How are you joining today?",
    adminTitle: "Admin Command Access",
    adminDesc: "Triage reports, verify clusters & dispatch resources",
    rescuerTitle: "Rescuer Field Portal",
    rescuerDesc: "Track supplies, shelters & auto-nearest disaster handoff",
    citizenTitle: "Citizen Access",
    citizenDesc: "Report an incident or pledge community resources",
  },
  Hindi: {
    heroKicker: "सामुदायिक प्रतिक्रिया नेटवर्क",
    title: "आपदा प्रतिक्रिया कमांड सेंटर",
    subtitle: "आपात स्थितियों की रिपोर्ट करें, बचाव इकाइयों और फील्ड आपूर्ति का समन्वय करें, और हर सेकंड महत्वपूर्ण होने पर अपने जिले को जोड़े रखें।",
    languageLabel: "पसंदीदा भाषा",
    eyebrow: "अपना कार्यक्षेत्र चुनें",
    workspaceHeading: "आज आप कैसे जुड़ रहे हैं?",
    adminTitle: "प्रशासक कमांड एक्सेस",
    adminDesc: "रिपोर्टों की जांच करें, क्लस्टर सत्यापित करें और संसाधन भेजें",
    rescuerTitle: "बचावकर्ता फील्ड पोर्टल",
    rescuerDesc: "आपूर्ति, आश्रयों और स्वतः-निकटतम आपदा हैंडऑफ़ को ट्रैक करें",
    citizenTitle: "नागरिक एक्सेस",
    citizenDesc: "घटना की रिपोर्ट करें या सामुदायिक संसाधनों की प्रतिज्ञा करें",
  },
  Bengali: {
    heroKicker: "কমিউনিটি রেসপন্স নেটওয়ার্ক",
    title: "দুর্যোগ প্রতিক্রিয়া কমান্ড সেন্টার",
    subtitle: "জরুরি অবস্থার রিপোর্ট করুন, উদ্ধারকারী দল ও ফিল্ড সরবরাহ সমন্বয় করুন এবং প্রতিটি মুহূর্ত যখন মূল্যবান তখন আপনার জেলাকে সংযুক্ত রাখুন।",
    languageLabel: "পছন্দের ভাষা",
    eyebrow: "আপনার ওয়ার্কস্পেস বেছে নিন",
    workspaceHeading: "আজ আপনি কীভাবে যোগদান করছেন?",
    adminTitle: "অ্যাডমিন কমান্ড অ্যাক্সেস",
    adminDesc: "রিপোর্ট যাচাই করুন, ক্লাস্টার নিশ্চিত করুন এবং সম্পদ প্রেরণ করুন",
    rescuerTitle: "উদ্ধারকারী ফিল্ড পোর্টাল",
    rescuerDesc: "সরবরাহ, আশ্রয়কেন্দ্র এবং স্বয়ংক্রিয়-নিকটবর্তী দুর্যোগ হ্যান্ডঅফ ট্র্যাক করুন",
    citizenTitle: "নাগরিক অ্যাক্সেস",
    citizenDesc: "একটি ঘটনার রিপোর্ট করুন বা কমিউনিটি সম্পদ দান করুন",
  },
  Odia: {
    heroKicker: "ସାମୁଦାୟିକ ପ୍ରତିକ୍ରିୟା ନେଟୱର୍କ",
    title: "ବିପର୍ଯ୍ୟୟ ପ୍ରତିକ୍ରିୟା କମାଣ୍ଡ ସେଣ୍ଟର",
    subtitle: "ଜରୁରୀକାଳୀନ ପରିସ୍ଥିତି ରିପୋର୍ଟ କରନ୍ତୁ, ଉଦ୍ଧାରକାରୀ ଦଳ ଏବଂ ସାମଗ୍ରୀ ସମନ୍ୱୟ କରନ୍ତୁ ଏବଂ ପ୍ରତିଟି ମୂହୁର୍ତ୍ତ ମୂଲ୍ୟବାନ ଥିବାବେଳେ ଜିଲ୍ଲାକୁ ସଂଯୋଗ କରନ୍ତୁ।",
    languageLabel: "ପସନ୍ଦର ଭାଷା",
    eyebrow: "ଆପଣଙ୍କର କାର୍ଯ୍ୟକ୍ଷେତ୍ର ବାଛନ୍ତୁ",
    workspaceHeading: "ଆଜି ଆପଣ କିପରି ଯୋଗ ଦେଉଛନ୍ତି?",
    adminTitle: "ଆଡମିନ୍ କମାଣ୍ଡ ପ୍ରବେଶ",
    adminDesc: "ରିପୋର୍ଟ ଯାଞ୍ଚ କରନ୍ତୁ, କ୍ଲଷ୍ଟର ନିଶ୍ଚିତ କରନ୍ତୁ ଏବଂ ସମ୍ପଦ ପ୍ରେରଣ କରନ୍ତು",
    rescuerTitle: "ଉଦ୍ଧାରକାରୀ ଫିଲ୍ଡ ପୋର୍ଟାଲ",
    rescuerDesc: "ସାମଗ୍ରୀ, ଆଶ୍ରୟସ୍ଥଳ ଏବଂ ସ୍ୱୟଂକ୍ରିୟ ବିପର୍ଯ୍ୟୟ ହ୍ୟାଣ୍ଡଅଫ୍ ଟ୍ରାକ୍ କରନ୍ତୁ",
    citizenTitle: "ନାଗରିକ ପ୍ରବେଶ",
    citizenDesc: "ଏକ ଜରୁରୀ ପରିସ୍ଥିତି ରିପୋର୍ଟ କରନ୍ତୁ କିମ୍ବା ସାମୁଦାୟିକ ସମ୍ପଦ ଦାନ କରନ୍ତୁ",
  },
  Telugu: {
    heroKicker: "కమ్యూనిటీ రెస్పాన్స్ నెట్‌వర్క్",
    title: "విపత్తు ప్రతిస్పందన కమాండ్ సెంటర్",
    subtitle: "అత్యవసర పరిస్థితులను నివేదించండి, రెస్క్యూ యూనిట్లు & ఫీల్డ్ సామాగ్రిని సమన్వయం చేయండి మరియు ప్రతి సెకను కీలకమైనప్పుడు మీ జిల్లాను కనెక్ట్ చేసి ఉంచండి.",
    languageLabel: "ప్రాధాన్యత భాష",
    eyebrow: "మీ వర్క్‌స్పేస్‌ను ఎంచుకోండి",
    workspaceHeading: "ఈరోజు మీరు ఎలా జాయిన్ అవుతున్నారు?",
    adminTitle: "అడ్మిన్ కమాండ్ యాక్సెస్",
    adminDesc: "నివేదికలను క్రమబద్ధీకరించండి, క్లస్టర్లను ధృవీకరించండి & వనరులను పంపండి",
    rescuerTitle: "రెస్క్యూయర్ ఫీల్డ్ పోర్టల్",
    rescuerDesc: "సరఫరా, ఆశ్రయాలు & స్వయంచాలక విపత్తు హ్యాండ్‌ఆఫ్‌లను ట్రాక్ చేయండి",
    citizenTitle: "సిటిజన్ యాక్సెస్",
    citizenDesc: "ఘటనను నివేదించండి లేదా సంఘం వనరులను ప్రతిజ్ఞ చేయండి",
  }
};

type SupportedLang = "English" | "Hindi" | "Bengali" | "Odia" | "Telugu";

const STORAGE_KEY = "momentum_language";

const LEGACY_CODE_MAP: Record<string, SupportedLang> = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
  or: "Odia",
  te: "Telugu",
};

function normalizeLang(value: string | null): SupportedLang | null {
  if (!value) return null;
  if (value in TRANSLATIONS) return value as SupportedLang;
  return LEGACY_CODE_MAP[value] ?? null;
}

export default function Home() {
  const [lang, setLang] = useState<SupportedLang>("English");

  // Load the stored preference once, after mount (avoids SSR/hydration mismatch).
  useEffect(() => {
    try {
      const stored = normalizeLang(localStorage.getItem(STORAGE_KEY));
      if (stored) setLang(stored);
    } catch {
      /* localStorage unavailable — keep default */
    }
  }, []);

  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.English;

  function handleLanguageChange(selected: string) {
    const value = normalizeLang(selected) ?? "English";
    setLang(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore persistence failure */
    }
  }

  return (
    <main className="public-home">
      <header className="public-header">
        <div className="public-brand">
          <ShieldCheck size={25} />
          <span>MOMENTUM</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="home-button">
            <span>HOME</span>
          </Link>
        </div>
      </header>

      <section className="home-hero">
        <div className="home-copy">
          <p className="hero-kicker">{t.heroKicker}</p>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>

          <div className="language-picker">
            <Languages size={17} />
            <label htmlFor="language">{t.languageLabel}</label>
            <select 
              id="language" 
              value={lang} 
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
              <option value="Bengali">Bengali (বাংলা)</option>
              <option value="Odia">Odia (ଓଡ଼ିଆ)</option>
              <option value="Telugu">Telugu (తెలుగు)</option>
            </select>
          </div>
        </div>

        <div className="access-panel">
          <p className="eyebrow">{t.eyebrow}</p>
          <h2>{t.workspaceHeading}</h2>

          <div className="access-options">
            <Link href="/admin/login" className="access-button admin-access">
              <ShieldCheck size={22} />
              <span>
                <strong>{t.adminTitle}</strong>
                <small>{t.adminDesc}</small>
              </span>
              <ArrowRight size={18} />
            </Link>

            <Link href="/rescuer/login" className="access-button rescuer-access">
              <Truck size={22} />
              <span>
                <strong>{t.rescuerTitle}</strong>
                <small>{t.rescuerDesc}</small>
              </span>
              <ArrowRight size={18} />
            </Link>

            <Link href="/citizen/login" className="access-button citizen-access">
              <UsersRound size={22} />
              <span>
                <strong>{t.citizenTitle}</strong>
                <small>{t.citizenDesc}</small>
              </span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
