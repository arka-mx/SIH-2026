"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/public/BackButton";
import { useLanguage } from "@/lib/language";

const TRANSLATIONS = {
  English: {
    kicker: "Community response access",
    heading: "Help your community move faster.",
    subheading: "Share what is happening or offer your skills to people who need support.",
    title: "Citizen access",
    name: "Name",
    location: "Location",
    language: "Language",
    submit: "Enter citizen panel"
  },
  Hindi: {
    kicker: "सामुदायिक प्रतिक्रिया पहुंच",
    heading: "अपने समुदाय की तेजी से मदद करें।",
    subheading: "समर्थन की आवश्यकता वाले लोगों को बताएं कि क्या हो रहा है या अपने कौशल की पेशकश करें।",
    title: "नागरिक पहुंच",
    name: "नाम",
    location: "स्थान",
    language: "भाषा",
    submit: "नागरिक पैनल में प्रवेश करें"
  },
  Bengali: {
    kicker: "কমিউনিটি রেসপন্স অ্যাক্সেস",
    heading: "আপনার সম্প্রদায়কে দ্রুত সাহায্য করুন।",
    subheading: "কী ঘটছে তা শেয়ার করুন বা যাদের সমর্থন প্রয়োজন তাদের কাছে আপনার দক্ষতাগুলি অফার করুন।",
    title: "নাগরিক অ্যাক্সেস",
    name: "নাম",
    location: "স্থান",
    language: "ভাষা",
    submit: "নাগরিক প্যানেলে প্রবেশ করুন"
  },
  Odia: {
    kicker: "ସାମୁଦାୟିକ ପ୍ରତିକ୍ରିୟା ପ୍ରବେଶ",
    heading: "ଆପଣଙ୍କର ସମ୍ପ୍ରଦାୟକୁ ଶୀଘ୍ର ସାହାଯ୍ୟ କରନ୍ତୁ।",
    subheading: "କଣ ଘଟୁଛି ସେୟାର କରନ୍ତୁ କିମ୍ବା ସାହାଯ୍ୟ ଆବଶ୍ୟକ କରୁଥିବା ଲୋକଙ୍କୁ ଆପଣଙ୍କର ଦକ୍ଷତା ପ୍ରଦାନ କରନ୍ତୁ।",
    title: "ନାଗରିକ ପ୍ରବେଶ",
    name: "ନାମ",
    location: "ସ୍ଥାନ",
    language: "ଭାଷା",
    submit: "ନାଗରିକ ପ୍ୟାନେଲରେ ପ୍ରବେଶ କରନ୍ତୁ"
  },
  Telugu: {
    kicker: "కమ్యూనిటీ రెస్పాన్స్ యాక్సెస్",
    heading: "మీ కమ్యూనిటీ వేగంగా స్పందించేలా సహాయం చేయండి.",
    subheading: "ఏమి జరుగుతుందో షేర్ చేయండి లేదా మద్దతు అవసరమైన వ్యక్తులకు మీ నైపుణ్యాలను అందించండి.",
    title: "సిటిజన్ యాక్సెస్",
    name: "పేరు",
    location: "ప్రాంతం",
    language: "భాష",
    submit: "సిటిజన్ ప్యానెల్‌లోకి ప్రవేశించండి"
  }
};

type SupportedLang = "English" | "Hindi" | "Bengali" | "Odia" | "Telugu";

export default function CitizenLoginPage() {
  const router = useRouter();
  const { name: lang } = useLanguage();
  const [name, setName] = useState(process.env.NEXT_PUBLIC_DEFAULT_CITIZEN_NAME || "Rajesh Kumar");

  const t = TRANSLATIONS[lang as SupportedLang] || TRANSLATIONS.English;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/citizen");
  }

  return (
    <main className="public-home theme-light">
      <BackButton />
      <section className="access-form-layout">
        <form className="access-form" onSubmit={handleSubmit}>
          <div className="form-icon citizen-icon">
            <UsersRound size={24} />
          </div>
          <h2>{t.title}</h2>

          <label htmlFor="citizen-name">
            {t.name}
            <input
              id="citizen-name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="mt-1"
            />
          </label>

          <button className="form-submit citizen-submit" type="submit">
            {t.submit} <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}