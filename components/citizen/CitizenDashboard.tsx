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
import { WeatherWidget } from "@/components/ui/WeatherWidget";
import { useLanguage } from "@/lib/language";
import { LanguageSelect } from "@/components/ui/LanguageSelect";

const TRANSLATIONS = {
  en: {
    title: "Report an Emergency",
    desk: "Citizen Response Desk",
    simNewId: "New Reporter ID",
    quickPresets: "Demo Quick Coordinate Presets:",
    mumbaiFlood: "Mumbai Flood Zone",
    brahmapurDist: "Brahmapur District",
    detectGps: "Detect Device GPS",
    gpsDetecting: "Detecting GPS...",
    locLandmark: "Location Name / Landmark",
    placeholderLoc: "e.g. Near New Bus Stand / Bridge",
    lat: "Latitude",
    lng: "Longitude",
    typeDisaster: "Type of Disaster",
    helpNeeded: "Immediate Help Needed",
    injured: "People Injured",
    trapped: "Casualties / Trapped",
    photo: "Photo Evidence (Optional)",
    photoHint: "Click to upload photo or take picture on camera",
    safeLabel: "I am currently in a safe location",
    submit: "Submit Emergency Report",
    submitting: "Transmitting GPS Report...",
    reportSuccess: "Emergency Report Filed Successfully!",
    verifiedBadge: "Auto-Verified (3+ Reports)",
    unverifiedBadge: "Unverified Pin (Awaiting 2 More Reports)",
    trackReports: "Track in My Reports →",
    trustInfoVerified: "✓ Trust layer clustered 3+ distinct reports nearby. Incident is escalated for authority dispatch shortlist.",
    trustInfoPending: "⏳ Report is live on the dispatch map. Once 3 distinct sessions report within 200m & 15 mins, confidence auto-escalates.",
    situationHeading: "What is the situation?",
    zeroLoginDesk: "Zero-Login Emergency Dispatch",
    flood: "Flood",
    cyclone: "Cyclone",
    landslide: "Landslide",
    medical: "Medical Emergency",
    fire: "Fire",
    other: "Other Incident",
    rescueTeamOption: "Rescue Team / Evacuation",
    boatOption: "Inflatable Boat / Water Rescue",
    medicalOption: "Medical Ambulance & Doctors",
    shelterOption: "Emergency Shelter / Camp",
    foodOption: "Food & Clean Drinking Water"
  },
  hi: {
    title: "आपातकाल की रिपोर्ट करें",
    desk: "नागरिक प्रतिक्रिया डेस्क",
    simNewId: "नया रिपोर्टर आईडी",
    quickPresets: "डेमो त्वरित समन्वय प्रीसेट:",
    mumbaiFlood: "मुंबई बाढ़ क्षेत्र",
    brahmapurDist: "ब्रह्मपुर जिला",
    detectGps: "डिवाइस जीपीएस खोजें",
    gpsDetecting: "जीपीएस खोजा जा रहा है...",
    locLandmark: "स्थान का नाम / मील का पत्थर",
    placeholderLoc: "जैसे: नए बस स्टैंड / पुल के पास",
    lat: "अक्षांश (Latitude)",
    lng: "देशांतर (Longitude)",
    typeDisaster: "आपदा का प्रकार",
    helpNeeded: "तत्काल सहायता की आवश्यकता",
    injured: "घायल लोग",
    trapped: "हताहत / फंसे हुए लोग",
    photo: "फोटो साक्ष्य (वैकल्पिक)",
    photoHint: "फोटो अपलोड करने या कैमरा से तस्वीर लेने के लिए क्लिक करें",
    safeLabel: "मैं वर्तमान में सुरक्षित स्थान पर हूँ",
    submit: "आपातकालीन रिपोर्ट सबमिट करें",
    submitting: "जीपीएस रिपोर्ट प्रसारित की जा रही है...",
    reportSuccess: "आपातकालीन रिपोर्ट सफलतापूर्वक दर्ज की गई!",
    verifiedBadge: "स्वतः-सत्यापित (3+ रिपोर्ट)",
    unverifiedBadge: "अपुष्ट पिन (2 और रिपोर्ट की प्रतीक्षा है)",
    trackReports: "मेरी रिपोर्टों में ट्रैक करें →",
    trustInfoVerified: "✓ ट्रस्ट लेयर ने आस-पास 3+ अलग-अलग रिपोर्टों को क्लस्टर किया है। घटना को प्रेषण के लिए आगे बढ़ा दिया गया है।",
    trustInfoPending: "⏳ रिपोर्ट लाइव मैप पर है। एक बार 3 अलग-अलग उपयोगकर्ता 200 मीटर और 15 मिनट के भीतर रिपोर्ट करेंगे, तो यह सत्यापित हो जाएगी।",
    situationHeading: "वर्तमान स्थिति क्या है?",
    zeroLoginDesk: "शून्य-लॉगिन आपातकालीन प्रेषण",
    flood: "बाढ़",
    cyclone: "चक्रवात",
    landslide: "भूस्खलन",
    medical: "चिकित्सा आपातकाल",
    fire: "आग लगना",
    other: "अन्य घटना",
    rescueTeamOption: "बचाव दल / सुरक्षित निकासी",
    boatOption: "नाव / पानी से बचाव",
    medicalOption: "एम्बुलेंस और डॉक्टर",
    shelterOption: "आपातकालीन आश्रय / शिविर",
    foodOption: "भोजन और स्वच्छ पेयजल"
  },
  bn: {
    title: "জরুরি প্রতিবেদন দাখিল",
    desk: "নাগরিক প্রতিক্রিয়া ডেস্ক",
    simNewId: "নতুন রিপোর্টার আইডি",
    quickPresets: "ডেমো কুইক কোঅর্ডিনেট প্রিসেট:",
    mumbaiFlood: "মুম্বাই বন্যা অঞ্চল",
    brahmapurDist: "ব্রহ্মপুর জেলা",
    detectGps: "ডিভাইস জিপিএস সনাক্ত করুন",
    gpsDetecting: "জিপিএস সনাক্ত করা হচ্ছে...",
    locLandmark: "স্থানের নাম / ল্যান্ডমার্ক",
    placeholderLoc: "যেমন: নতুন বাস স্ট্যান্ড বা ব্রিজের কাছে",
    lat: "অক্ষাংশ",
    lng: "দ্রাঘিমাংশ",
    typeDisaster: "দুর্যোগের ধরণ",
    helpNeeded: "তাত্ক্ষণিক সহায়তা প্রয়োজন",
    injured: "আহত মানুষের সংখ্যা",
    trapped: "নিহত / আটকা পড়া মানুষ",
    photo: "ছবি প্রমাণ (ঐচ্ছিক)",
    photoHint: "ছবি আপলোড করতে বা ক্যামেরা থেকে ছবি তুলতে ক্লিক করুন",
    safeLabel: "আমি বর্তমানে নিরাপদ স্থানে আছি",
    submit: "জরুরি প্রতিবেদন জমা দিন",
    submitting: "জিপিএস প্রতিবেদন পাঠানো হচ্ছে...",
    reportSuccess: "জরুরি প্রতিবেদন সফলভাবে জমা হয়েছে!",
    verifiedBadge: "স্বয়ংক্রিয়-যাচাইকৃত (৩+ প্রতিবেদন)",
    unverifiedBadge: "অযাচাইকৃত পিন (আরো ২টি প্রতিবেদনের অপেক্ষা)",
    trackReports: "আমার প্রতিবেদন ট্র্যাক করুন →",
    trustInfoVerified: "✓ ট্রাস্ট লেয়ার কাছাকাছি ৩+ টি স্বতন্ত্র প্রতিবেদন ক্লাস্টার করেছে। কর্তৃপক্ষ দ্রুত ব্যবস্থা নিচ্ছে।",
    trustInfoPending: "⏳ প্রতিবেদন লাইভ ম্যাপে রয়েছে। ২০০ মিটারের মধ্যে ৩ জন রিপোর্ট করলেই এটি নিশ্চিত হবে।",
    situationHeading: "বর্তমান পরিস্থিতি কী?",
    zeroLoginDesk: "জিরো-লগইন জরুরি প্রেরণ",
    flood: "বন্যা",
    cyclone: "ঘূর্ণিঝড়",
    landslide: "ভূমিধস",
    medical: "চিকিৎসা জরুরি অবস্থা",
    fire: "অগ্নিকাণ্ড",
    other: "অন্যান্য ঘটনা",
    rescueTeamOption: "উদ্ধারকারী দল / নিরাপদ স্থানান্তর",
    boatOption: "নৌকা উদ্ধার কার্যক্রম",
    medicalOption: "মেডিকেল অ্যাম্বুলেন্স ও ডাক্তার",
    shelterOption: "জরুরি আশ্রয় / ক্যাম্প",
    foodOption: "খাদ্য ও বিশুদ্ধ পানীয় জল"
  },
  or: {
    title: "ଜରୁରୀକାଳୀନ ରିପୋର୍ଟ ପ୍ରଦାନ",
    desk: "ନାଗରିକ ପ୍ରତିକ୍ରିୟା ଡେସ୍କ",
    simNewId: "ନୂତନ ରିପୋର୍ଟର୍ ଆଇଡି",
    quickPresets: "ଡେମୋ କ୍ଵିକ୍ କୋଅର୍ଡିନେଟ୍ ପ୍ରିସେଟ୍:",
    mumbaiFlood: "ମୁମ୍ବାଇ ବନ୍ୟା ପ୍ରପୀଡିତ ଅଞ୍ଚଳ",
    brahmapurDist: "ବ୍ରହ୍ମପୁର ଜିଲ୍ଲା",
    detectGps: "ଡିଭାଇସ୍ ଜିପିଏସ୍ ଯାଞ୍ଚ କରନ୍ତୁ",
    gpsDetecting: "ଜିପିଏସ୍ ଖୋଜା ଚାଲିଛି...",
    locLandmark: "ସ୍ଥାନର ନାମ / ଚିହ୍ନ",
    placeholderLoc: "ଯେପରିକି: ନୂଆ ବସ୍ ଷ୍ଟାଣ୍ଡ କିମ୍ବା ପୋଲ ପାଖରେ",
    lat: "ଅକ୍ଷାଂଶ",
    lng: "ଦ୍ରାଘିମା",
    typeDisaster: "ବିପର୍ଯ୍ୟୟର ପ୍ରକାର",
    helpNeeded: "ତୁରନ୍ତ ସାହାଯ୍ୟ ଆବଶ୍ୟକ",
    injured: "ଆହତ ଲୋକଙ୍କ ସଂଖ୍ୟା",
    trapped: "ଫସି ରହିଥିବା ଲୋକ",
    photo: "ଫଟୋ ପ୍ରମାଣ (ବୈକଳ୍ପିକ)",
    photoHint: "ଫଟୋ ଅପଲୋଡ୍ କରିବାକୁ କିମ୍ବା କ୍ୟାମେରା ବ୍ୟବହାର କରିବାକୁ କ୍ଲିକ୍ କରନ୍ତୁ",
    safeLabel: "ମୁଁ ବର୍ତ୍ତମାନ ସୁରକ୍ଷିତ ସ୍ଥାନରେ ଅଛି",
    submit: "ଜରୁରୀକାଳୀନ ରିପୋର୍ଟ ଦାଖଲ କରନ୍ତୁ",
    submitting: "ଜିପିଏସ୍ ରିପୋର୍ଟ ପଠାଯାଉଛି...",
    reportSuccess: "ଜରୁରୀକାଳୀନ ରିପୋର୍ଟ ସଫଳତାର ସହ ଦାଖଲ ହେଲା!",
    verifiedBadge: "ସ୍ୱୟଂକ୍ରିୟ-ଯାଞ୍ଚ ହୋଇଛି (୩+ ରିପୋର୍ଟ)",
    unverifiedBadge: "ଅଯାଞ୍ଚିତ ପିନ୍ (ଆଉ ୨ଟି ରିପୋର୍ଟକୁ ଅପେକ୍ଷା)",
    trackReports: "ମୋର ରିପୋର୍ଟ ଟ୍ରାକ୍ କରନ୍ତୁ →",
    trustInfoVerified: "✓ ପାଖାପାଖି ୩+ ଅଲଗା ରିପୋର୍ଟ ମିଳିଛି। ପ୍ରଶାସନ ତୁରନ୍ତ ପଦକ୍ଷେପ ନେଉଛି।",
    trustInfoPending: "⏳ ରିପୋର୍ଟ ମାନଚିତ୍ରରେ ଉପଲବ୍ଧ ଅଛି। ୩ଟି ସମାନ ରିପୋର୍ଟ ମିଳିବା ପରେ ଏହା ନିଶ୍ଚିତ ହେବ।",
    situationHeading: "ବର୍ତ୍ତମାନର ସ୍ଥିତି କଣ?",
    zeroLoginDesk: "ଶୂନ୍ୟ-ଲଗଇନ୍ ଜରୁରୀକାଳୀନ ସେବା",
    flood: "ବନ୍ୟା",
    cyclone: "ବାତ୍ୟା",
    landslide: "ଭୂସ୍ଖଳନ",
    medical: "ଡାକ୍ତରୀ ଜରୁରୀକାଳୀନ ସ୍ଥିତି",
    fire: "ଅଗ୍ନିକାଣ୍ଡ",
    other: "ଅନ୍ୟାନ୍ୟ ବିପର୍ଯ୍ୟୟ",
    rescueTeamOption: "ଉଦ୍ଧାରକାରୀ ଦଳ / ସ୍ଥାନାନ୍ତର",
    boatOption: "ଡଙ୍ଗା / ଜଳ ଉଦ୍ଧାର",
    medicalOption: "ଡାକ୍ତରୀ ଆମ୍ବୁଲାନ୍ସ ଓ ଡାକ୍ତର",
    shelterOption: "ଜରୁରୀକାଳୀନ ଆଶ୍ରୟସ୍ଥଳୀ",
    foodOption: "ଖାଦ୍ୟ ଏବଂ ପାନୀୟ ଜଳ"
  },
  te: {
    title: "అత్యవసర నివేదికను సమర్పించండి",
    desk: "సిటిజన్ రెస్పాన్స్ డెస్క్",
    simNewId: "కొత్త రిపోర్టర్ ఐడి",
    quickPresets: "డెమో శీఘ్ర కోఆర్డినేట్ ప్రిసెట్స్:",
    mumbaiFlood: "ముంబై వరద ప్రాంతం",
    brahmapurDist: "బ్రహ్మపూర్ జిల్లా",
    detectGps: "డివైస్ జీపీఎస్ కనుగొనండి",
    gpsDetecting: "జీపీఎస్ శోధిస్తోంది...",
    locLandmark: "ప్రాంతం పేరు / ల్యాండ్‌మార్క్",
    placeholderLoc: "ఉదా: కొత్త బస్ స్టాండ్ / వంతెన సమీపంలో",
    lat: "అక్షాంశం (Latitude)",
    lng: "రేఖాంశం (Longitude)",
    typeDisaster: "విపత్తు రకం",
    helpNeeded: "తక్షణ సహాయం అవసరం",
    injured: "గాయపడిన వ్యక్తులు",
    trapped: "చిక్కుకుపోయిన వ్యక్తులు",
    photo: "ఫోటో సాక్ష్యం (ఐచ్ఛికం)",
    photoHint: "ఫోటో అప్‌లోడ్ చేయడానికి లేదా కెమెరా నుండి తీయడానికి క్లిక్ చేయండి",
    safeLabel: "నేను ప్రస్తుతం సురక్షితమైన ప్రదేశంలో ఉన్నాను",
    submit: "అత్యవసర నివేదికను సమర్పించండి",
    submitting: "జీపీఎస్ నివేదిక పంపబడుతోంది...",
    reportSuccess: "అత్యవసర నివేదిక విజయవంతంగా సమర్పించబడింది!",
    verifiedBadge: "ఆటో-ధృవీకరించబడింది (3+ నివేదికలు)",
    unverifiedBadge: "ధృవీకరించని పిన్ (మరో 2 నివేదికల కోసం ఎదురుచూస్తోంది)",
    trackReports: "నా నివేదికలను ట్రాక్ చేయండి →",
    trustInfoVerified: "✓ సమీపంలో 3+ విభిన్న నివేదికలు క్లస్టర్ చేయబడ్డాయి. అధికారులు చర్యలు చేపడుతున్నారు.",
    trustInfoPending: "⏳ నివేదిక లైవ్ మ్యాప్‌లో ఉంది. 200 మీటర్లలోపు 3 నివేదికలు వస్తే ధృవీకరించబడుతుంది.",
    situationHeading: "ప్రస్తుత పరిస్థితి ఏమిటి?",
    zeroLoginDesk: "జీరో-లాగిన్ అత్యవసర సేవ",
    flood: "వరద",
    cyclone: "తుఫాను",
    landslide: "కొండచరియలు విరిగిపడటం",
    medical: "వైద్య అత్యవసర పరిస్థితి",
    fire: "అగ్నిప్రమాదం",
    other: "ఇతర ప్రమాదం",
    rescueTeamOption: "రెస్క్యూ టీమ్ / తరలింపు",
    boatOption: "వరద బోటు సహాయం",
    medicalOption: "వైద్య అంబులెన్స్ & వైద్యులు",
    shelterOption: "అత్యవసర ఆశ్రయం / క్యాంప్",
    foodOption: "ఆహారం మరియు త్రాగునీరు"
  }
};

type SupportedLangKey = "en" | "hi" | "bn" | "or" | "te";

export function CitizenDashboard() {
  const { code: lang } = useLanguage();
  const [sessionId, setSessionId] = useState<string>("");
  const [lat, setLat] = useState<string>("19.0760");
  const [lng, setLng] = useState<string>("72.8777");
  const [locationName, setLocationName] = useState<string>("Mumbai Coastal Sector");
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

  // Prefill the emergency location when arriving from a scanned shelter poster.
  useEffect(() => {
    const loc = new URLSearchParams(window.location.search).get("loc");
    if (loc) setLocationName(loc);
  }, []);

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
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10000 }
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
      setPhotoPreview(URL.createObjectURL(file));
    }
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

      if (selectedPhoto) {
        formData.append("photo", selectedPhoto);
      }

      const fullDesc = `[${locationName}] Emergency Request (${disasterType.toUpperCase()}) - Injured: ${injured}, Trapped: ${casualties}, Safe: ${isSafe ? 'Yes' : 'No'}`;
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

  const t = TRANSLATIONS[lang];

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t.desk}</p>
          <h1>{t.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <WeatherWidget lat={parseFloat(lat) || 19.0760} lng={parseFloat(lng) || 72.8777} />

          <LanguageSelect variant="compact" />

          <span className="login-note flex items-center gap-1.5 border border-emerald-300 bg-emerald-50/80 px-3 py-1 rounded-xl">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span className="text-xs font-bold text-emerald-950">IP Session:</span>
            <code className="text-xs bg-white text-emerald-900 px-2 py-0.5 rounded font-mono font-extrabold border border-emerald-200">{sessionId}</code>
          </span>

          <button 
            type="button" 
            onClick={handleNewSession}
            className="text-xs text-stone-600 hover:text-emerald-700 bg-white border border-stone-200 hover:border-emerald-500 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
            title="Simulate a new independent citizen reporter"
          >
            <RotateCcw size={12} /> {t.simNewId}
          </button>
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

        <Link href="/citizen/volunteer" className="volunteer-action flex items-center justify-between p-6 bg-white border border-stone-200 hover:border-emerald-500 rounded-2xl shadow-2xs transition-all">
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
        <div className="mb-6 p-4 rounded-xl border border-red-300 bg-red-50 text-red-900 text-sm flex items-center gap-2 shadow-2xs">
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
                className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer"
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
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-2xs text-xs cursor-pointer"
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
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
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
                      className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden cursor-pointer"
                    >
                      <option value="flood">🌊 {t.flood}</option>
                      <option value="cyclone">🌪️ {t.cyclone}</option>
                      <option value="landslide">⛰️ {t.landslide}</option>
                      <option value="medical">🚑 {t.medical}</option>
                      <option value="fire">🔥 {t.fire}</option>
                      <option value="other">⚠️ {t.other}</option>
                    </select>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-1/3 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
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