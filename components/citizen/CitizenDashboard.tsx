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
import { WeatherWidget } from "@/components/ui/WeatherWidget";

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
    medical: "ଡାକ୍ତରୀ ଜରուରୀକାଳୀନ ସ୍ଥିତି",
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
  const [lang, setLang] = useState<SupportedLangKey>("en");
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
    // Default inside panel to English on initial load
    setLang("en");
  }, []);

  function handleNewSession() {
    const newId = createNewSessionId();
    setSessionId(newId);
    setSubmittedReport(null);
    setVerifiedCluster(null);
  }

  function handleDetectGPS() {
    if (typeof window === "undefined" || !navigator.geolocation) {
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
        
        // Reverse Geocode coordinates to address
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                "User-Agent": "MomentumDisasterResponse/1.0"
              }
            }
          );
          if (res.ok) {
            const data = await res.json();
            // Shorten the address to make it legible in the input field
            const address = data.display_name || data.name || `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
            setLocationName(address);
          } else {
            setLocationName(`GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          }
        } catch (e) {
          console.warn("Reverse-geocoding failed:", e);
          setLocationName(`GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        }
        setGpsLoading(false);
      },
      (err) => {
        console.warn("GPS detection error:", err);
        let msg = "Could not retrieve GPS coordinates.";
        if (err.code === 1) {
          msg = "Location permission denied. Please allow location access in your browser settings.";
        } else if (err.code === 2) {
          msg = "GPS position unavailable. Please ensure your device location is toggled on.";
        } else if (err.code === 3) {
          msg = "GPS request timed out. Please try clicking detect again.";
        }
        setError(msg);
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

  const t = TRANSLATIONS[lang];

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t.desk}</p>
          <h1>{t.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Weather Caching widget feed */}
          <WeatherWidget lat={parseFloat(lat) || 19.0760} lng={parseFloat(lng) || 72.8777} />

          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-white border border-stone-200 px-2 py-1 rounded-md shadow-2xs">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mr-1">LANG:</span>
            <select
              value={lang}
              onChange={(e) => {
                const selected = e.target.value as SupportedLangKey;
                setLang(selected);
                const mapping: Record<SupportedLangKey, string> = {
                  en: "English",
                  hi: "Hindi",
                  bn: "Bengali",
                  or: "Odia",
                  te: "Telugu"
                };
                localStorage.setItem("momentum_language", mapping[selected]);
              }}
              className="text-xs bg-transparent border-0 outline-none font-bold text-stone-700 cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="bn">বাংলা</option>
              <option value="or">ଓଡ଼ିଆ</option>
              <option value="te">తెలుగు</option>
            </select>
          </div>

          <span className="login-note hidden md:flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            Session: <code className="text-xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-mono">{sessionId.slice(0, 10)}...</code>
          </span>
          <button 
            type="button" 
            onClick={handleNewSession}
            className="text-xs text-stone-600 hover:text-emerald-700 bg-white border border-stone-200 hover:border-emerald-500 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm transition-all cursor-pointer"
            title="Simulate a new independent citizen reporter"
          >
            <RotateCcw size={12} /> {t.simNewId}
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
                  {t.reportSuccess}
                  {submittedReport.status === "verified" || (verifiedCluster && verifiedCluster.length >= 3) ? (
                    <span className="bg-emerald-600 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <Sparkles size={12} /> {t.verifiedBadge}
                    </span>
                  ) : (
                    <span className="bg-amber-500 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold">
                      {t.unverifiedBadge}
                    </span>
                  )}
                </h3>
                <p className="text-xs mt-1 opacity-90">
                  Incident ID: <strong className="font-mono">{submittedReport.id}</strong> · Location: <strong>{lat}, {lng}</strong> ({disasterType.toUpperCase()})
                </p>
                <p className="text-xs mt-1">
                  {submittedReport.status === "verified" || (verifiedCluster && verifiedCluster.length >= 3)
                    ? t.trustInfoVerified
                    : t.trustInfoPending}
                </p>
              </div>
            </div>
            <Link 
              href="/citizen/history" 
              className="bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold px-3 py-2 rounded-lg shadow-sm whitespace-nowrap"
            >
              {t.trackReports}
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
          <strong>{t.title}</strong>
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
            <p className="eyebrow">{t.zeroLoginDesk}</p>
            <h2 className="section-title">{t.situationHeading}</h2>
          </div>
          <HeartPulse size={22} className="text-rose-600" />
        </div>

        {/* Demo Quick Coordinate Helpers */}
        <div className="mb-4 p-3 bg-stone-50/80 rounded-lg border border-stone-200">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="font-semibold text-stone-700 flex items-center gap-1">
              <MapPin size={14} className="text-emerald-600" /> {t.quickPresets}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button 
                type="button" 
                onClick={() => handleSetPreset("Mumbai Coastal Zone", "19.0760", "72.8777")}
                className="px-2 py-1 bg-white border border-stone-300 hover:border-emerald-500 rounded text-[11px] font-medium shadow-2xs cursor-pointer"
              >
                {t.mumbaiFlood} (19.076, 72.877)
              </button>
              <button 
                type="button" 
                onClick={() => handleSetPreset("Brahmapur Hub", "19.3151", "84.7941")}
                className="px-2 py-1 bg-white border border-stone-300 hover:border-emerald-500 rounded text-[11px] font-medium shadow-2xs cursor-pointer"
              >
                {t.brahmapurDist} (19.315, 84.794)
              </button>
              <button 
                type="button" 
                onClick={handleDetectGPS}
                disabled={gpsLoading}
                className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer"
              >
                <Navigation size={11} /> {gpsLoading ? t.gpsDetecting : t.detectGps}
              </button>
            </div>
          </div>
        </div>

        <div className="form-grid">
          <label>
            {t.locLandmark}
            <div className="input-with-icon">
              <MapPin size={16} />
              <input 
                name="location" 
                required 
                placeholder={t.placeholderLoc}
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label>
              {t.lat}
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
              {t.lng}
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
            {t.typeDisaster}
            <select 
              name="disaster" 
              value={disasterType} 
              onChange={(e) => setDisasterType(e.target.value)}
            >
              <option value="flood">{t.flood}</option>
              <option value="cyclone">{t.cyclone}</option>
              <option value="landslide">{t.landslide}</option>
              <option value="medical">{t.medical}</option>
              <option value="fire">{t.fire}</option>
              <option value="other">{t.other}</option>
            </select>
          </label>

          <label>
            {t.helpNeeded}
            <select 
              name="help" 
              value={helpNeeded}
              onChange={(e) => setHelpNeeded(e.target.value)}
            >
              <option value="Rescue team">{t.rescueTeamOption}</option>
              <option value="Boat">{t.boatOption}</option>
              <option value="Medical assistance">{t.medicalOption}</option>
              <option value="Shelter">{t.shelterOption}</option>
              <option value="Food and water">{t.foodOption}</option>
            </select>
          </label>

          <label>
            {t.injured}
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
            {t.trapped}
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
              {t.photo}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-lg p-3 text-center cursor-pointer bg-stone-50/50 hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-2"
              >
                <Camera size={18} className="text-stone-500" />
                <span className="text-xs text-stone-600 font-medium">
                  {selectedPhoto ? selectedPhoto.name : t.photoHint}
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
                  className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs cursor-pointer"
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
            {t.safeLabel}
          </label>
          <button 
            className="form-submit report-submit flex items-center justify-center gap-2 cursor-pointer" 
            type="submit"
            disabled={loading}
          >
            <Send size={16} /> 
            {loading ? t.submitting : t.submit}
          </button>
        </div>
      </form>
    </>
  );
}