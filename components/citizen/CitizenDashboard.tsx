"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import {
  AlertTriangle,
  MapPin,
  Send,
  HandHeart,
  Navigation,
  CheckCircle2,
  X,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { 
  apiSubmitReport, 
  apiReverseGeocode, 
  apiReverseGeocodeDetailed,
  apiGetIncidentById, 
  apiGetActiveReportForSession,
  apiPublishSafeShare,
  apiCancelSos,
  ReportItem
} from "@/lib/api";
import { getOrCreateDeviceId } from "@/lib/device";
import {
  getCitizenProfile,
  getCachedActiveReport,
  cacheActiveReport,
} from "@/lib/citizenSession";
import { shareOrCopyLink } from "@/lib/shareLink";
import { CitizenLiveTrackingMap } from "@/components/citizen/CitizenLiveTrackingMap";
import { WeatherWidget } from "@/components/ui/WeatherWidget";
import { useLanguage } from "@/lib/language";

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
    foodOption: "Food & Clean Drinking Water",
    cancelSos: "Cancel SOS",
    cancelling: "Cancelling…",
    cancelConfirm: "Cancel this SOS? Rescue teams and the district admin will stop responding to it.",
    sosAborted: "SOS cancelled. Dispatch to the admin and rescue team has been stopped."
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
    foodOption: "भोजन और स्वच्छ पेयजल",
    cancelSos: "SOS रद्द करें",
    cancelling: "रद्द किया जा रहा है…",
    cancelConfirm: "इस SOS को रद्द करें? बचाव दल और जिला प्रशासन इस पर प्रतिक्रिया देना बंद कर देंगे।",
    sosAborted: "SOS रद्द कर दिया गया। प्रशासन और बचाव दल को भेजना रोक दिया गया है।"
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
    foodOption: "খাদ্য ও বিশুদ্ধ পানীয় জল",
    cancelSos: "SOS বাতিল করুন",
    cancelling: "বাতিল করা হচ্ছে…",
    cancelConfirm: "এই SOS বাতিল করবেন? উদ্ধারকারী দল ও জেলা প্রশাসন এতে সাড়া দেওয়া বন্ধ করবে।",
    sosAborted: "SOS বাতিল করা হয়েছে। প্রশাসন ও উদ্ধারকারী দলে পাঠানো বন্ধ করা হয়েছে।"
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
    foodOption: "ଖାଦ୍ୟ ଏବଂ ପାନୀୟ ଜଳ",
    cancelSos: "SOS ବାତିଲ୍ କରନ୍ତୁ",
    cancelling: "ବାତିଲ୍ ହେଉଛି…",
    cancelConfirm: "ଏହି SOS ବାତିଲ୍ କରିବେ? ଉଦ୍ଧାରକାରୀ ଦଳ ଏବଂ ଜିଲ୍ଲା ପ୍ରଶାସନ ଏଥିରେ ପ୍ରତିକ୍ରିୟା ବନ୍ଦ କରିବେ।",
    sosAborted: "SOS ବାତିଲ୍ ହୋଇଛି। ପ୍ରଶାସନ ଏବଂ ଉଦ୍ଧାରକାରୀ ଦଳକୁ ପଠାଇବା ବନ୍ଦ ହୋଇଛି।"
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
    foodOption: "ఆహారం మరియు త్రాగునీరు",
    cancelSos: "SOS రద్దు చేయండి",
    cancelling: "రద్దు చేస్తోంది…",
    cancelConfirm: "ఈ SOSని రద్దు చేయాలా? రెస్క్యూ బృందాలు మరియు జిల్లా అడ్మిన్ దీనికి స్పందించడం ఆపేస్తారు.",
    sosAborted: "SOS రద్దు చేయబడింది. అడ్మిన్ మరియు రెస్క్యూ బృందానికి పంపడం నిలిపివేయబడింది."
  }
};

type SupportedLangKey = "en" | "hi" | "bn" | "or" | "te";

/** How long a citizen must wait before they can push a fresh SOS on the same active report. */
const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

export function CitizenDashboard() {
  const { code: lang } = useLanguage();
  const [citizenName, setCitizenName] = useState<string>("");
  const [lat, setLat] = useState<string>("19.0760");
  const [lng, setLng] = useState<string>("72.8777");
  const [locationName, setLocationName] = useState<string>("Mumbai Coastal Sector");
  const [regionName, setRegionName] = useState<string>("Mumbai, Maharashtra");
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
  const [safeLinkCopied, setSafeLinkCopied] = useState<boolean>(false);
  const [safeShareUrl, setSafeShareUrl] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [sosAborted, setSosAborted] = useState<boolean>(false);

  // "Resend SOS" cooldown: timestamp (ms) of the last SOS the citizen pushed for
  // the active report, plus a 1s ticker so the countdown label stays live.
  const [lastSosAt, setLastSosAt] = useState<number>(0);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const [resending, setResending] = useState<boolean>(false);

  const resendMsLeft = lastSosAt ? Math.max(0, lastSosAt + RESEND_COOLDOWN_MS - nowTs) : 0;
  const canResend = lastSosAt > 0 && resendMsLeft === 0;

  /** Mark the active report cancelled everywhere and drop it from the citizen view. */
  function abortActiveReportLocally(cancelledReport: ReportItem) {
    const cancelled = { ...cancelledReport, status: "cancelled" as const };
    cacheActiveReport(cancelled); // status === "cancelled" clears the snapshot
    setSubmittedReport(cancelled);
    setActiveExistingReport(null);
    setLastSosAt(0);
    setSosAborted(true);
  }

  async function handleCancelSos() {
    const report = submittedReport || activeExistingReport;
    if (!report || cancelling) return;
    if (typeof window !== "undefined" && !window.confirm(t.cancelConfirm)) return;

    setCancelling(true);
    setError(null);
    try {
      await apiCancelSos(getOrCreateDeviceId(), { source: "citizen_cancel" });
      abortActiveReportLocally(report);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not cancel the SOS. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleShareSafeLink(report: ReportItem) {
    setError(null);

    // Sharing an "I'm safe" check-in means the emergency is over: abort the SOS
    // so it stops routing to the admin and the rescue team head.
    apiCancelSos(getOrCreateDeviceId(), { source: "citizen_safe" })
      .then(() => abortActiveReportLocally(report))
      .catch(() => {
        /* keep the report visible if the cancel call failed */
      });

    // The snapshot id is always the report id, so the shareable URL is known up
    // front. Show it immediately as a reliable fallback/confirmation.
    const shareUrl = `${window.location.origin}/safe/${report.id}`;
    setSafeShareUrl(shareUrl);

    // Publish the public snapshot in the background. Do NOT await it before
    // shareOrCopyLink(): the browser drops the click's user-activation across an
    // await, which makes navigator.share (and sometimes the clipboard) fail.
    const safeReport: ReportItem = {
      ...report,
      status: "cancelled",
      description: `${report.description || ""} | Safe: Yes`.trim(),
    };
    const publishing = apiPublishSafeShare(safeReport).catch((err: unknown) => {
      setError(
        err instanceof Error
          ? `${err.message} — the link above may take a moment to open.`
          : "The safe link may not open yet. Try Share again in a moment."
      );
    });

    const outcome = await shareOrCopyLink({
      title: "My safety status — Sanket",
      text: "I've shared my location and safety status. You can follow it live here:",
      url: shareUrl,
    });

    if (outcome === "copied") {
      setSafeLinkCopied(true);
      setTimeout(() => setSafeLinkCopied(false), 2500);
    }

    await publishing;
  }

  // Initialize Immutable Device-Specific Unique ID & check for active report
  useEffect(() => {
    async function initSession() {
      const devId = getOrCreateDeviceId();

      const profile = getCitizenProfile();
      if (profile?.name) setCitizenName(profile.name);

      // Restore the last-known active report instantly from local cache so a
      // refresh never drops "help is on the way" while the network is checked.
      const cached = getCachedActiveReport();
      if (cached) {
        setActiveExistingReport(cached);
        setSubmittedReport(cached);
        setLastSosAt(new Date(cached.updated_at || cached.created_at).getTime() || Date.now());
      }

      try {
        const active = await apiGetActiveReportForSession(devId);
        if (active) {
          // Server is source of truth when it has the report.
          cacheActiveReport(active);
          setActiveExistingReport(active);
          setSubmittedReport(active);
          setLastSosAt(new Date(active.updated_at || active.created_at).getTime() || Date.now());
        } else if (!cached) {
          // No local snapshot and server has nothing — genuinely no report.
          setActiveExistingReport(null);
        }
        // If the server returns nothing but we have a cached snapshot, keep it:
        // the in-memory server store is wiped on restart, the citizen's report
        // is not. Polling will clear it once it resolves.
      } catch {
        // offline — the cached snapshot is the best we have
      }
    }
    initSession();
  }, []);

  // Live status polling for citizen emergency report
  useEffect(() => {
    if (!submittedReport) return;

    const interval = setInterval(async () => {
      // By-id first; after a refresh the id may have drifted to the server's
      // incident id, so fall back to "the active report for this device".
      let fresh = await apiGetIncidentById(submittedReport.id);
      if (!fresh) {
        const devId = getOrCreateDeviceId();
        fresh = await apiGetActiveReportForSession(devId);
      }
      if (fresh) {
        setSubmittedReport(fresh);
        cacheActiveReport(fresh); // clears the snapshot once resolved/cancelled
        if (fresh.status !== "resolved" && fresh.status !== "cancelled") {
          setActiveExistingReport(fresh);
        } else {
          setActiveExistingReport(null);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [submittedReport?.id]);

  // Keep the "Resend SOS" countdown ticking while a report is active and cooling down.
  useEffect(() => {
    if (!submittedReport || canResend) return;
    const tick = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [submittedReport?.id, canResend]);

  // Auto-detect current location when the report modal opens
  const gpsAutoRequestedRef = useRef(false);
  useEffect(() => {
    if (isModalOpen && !gpsAutoRequestedRef.current) {
      gpsAutoRequestedRef.current = true;
      handleDetectGPS();
    }
    if (!isModalOpen) {
      gpsAutoRequestedRef.current = false;
    }
  }, [isModalOpen]);

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
          const detail = await apiReverseGeocodeDetailed(latitude, longitude);
          setLocationName(detail.displayName);
          setRegionName(detail.region);
        } catch {
          setLocationName(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          setRegionName(`Sector (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`);
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
          const detail = await apiReverseGeocodeDetailed(fallbackLat, fallbackLng);
          setLocationName(detail.displayName);
          setRegionName(detail.region);
        } catch {
          setLocationName("Mumbai Coastal Sector (Auto-detected)");
          setRegionName("Mumbai, Maharashtra");
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
    setRegionName(name.split("(")[0].trim());
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  function buildReportFormData(opts?: { message?: string; includePhoto?: boolean }) {
    const devId = getOrCreateDeviceId();
    const formData = new FormData();
    formData.append("device_id", devId);
    formData.append("session_id", devId);
    formData.append("idempotency_key", "idemp-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6));
    if (citizenName) formData.append("reporter_name", citizenName);
    formData.append("type", disasterType);
    formData.append("lat", lat);
    formData.append("lng", lng);
    formData.append("region", regionName);
    formData.append("address", locationName);
    if (opts?.includePhoto !== false && selectedPhoto) {
      formData.append("photo", selectedPhoto);
    }
    formData.append(
      "description",
      `[${locationName} | Region: ${regionName}] Emergency Request (${disasterType.toUpperCase()}) - Injured: ${injured}, Trapped: ${casualties}, Safe: ${isSafe ? "Yes" : "No"}`
    );
    if (opts?.message) formData.append("message", opts.message);
    return formData;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiSubmitReport(buildReportFormData());
      setSubmittedReport(response.report);
      setActiveExistingReport(response.report);
      cacheActiveReport(response.report);
      setLastSosAt(Date.now());
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit emergency report";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // Push a fresh SOS on the existing active report. The backend appends a new
  // report event, refreshes the location and timestamp, and bumps report_count
  // (which feeds trust clustering) — signalling the situation is still ongoing.
  async function handleResendSos() {
    if (!canResend || resending) return;
    setResending(true);
    setError(null);
    try {
      const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const response = await apiSubmitReport(
        buildReportFormData({ message: `SOS re-sent at ${stamp} — situation still ongoing`, includePhoto: false })
      );
      setSubmittedReport(response.report);
      setActiveExistingReport(response.report);
      cacheActiveReport(response.report);
      setLastSosAt(Date.now());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not re-send the SOS. Please try again.");
    } finally {
      setResending(false);
    }
  }

  const t = TRANSLATIONS[lang];

  const dispatched = Boolean(submittedReport?.assigned_rescuer);
  const reportOpen =
    !!submittedReport && submittedReport.status !== "resolved" && submittedReport.status !== "cancelled";
  const resendCountdown = (() => {
    const total = Math.ceil(resendMsLeft / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  })();
  const trackModifier = dispatched
    ? "cz-track--dispatched"
    : submittedReport?.status === "verified"
    ? "cz-track--verified"
    : "";

  return (
    <div data-no-translate style={{ display: "contents" }}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t.desk}</p>
          <h1>{t.title}</h1>
          {citizenName && (
            <p className="login-note" style={{ marginTop: 4 }}>
              Reporting as <strong>{citizenName}</strong>
            </p>
          )}
        </div>
        <WeatherWidget lat={parseFloat(lat) || 19.0760} lng={parseFloat(lng) || 72.8777} />
      </div>

      <div className="cz-actions">
        <button type="button" onClick={() => setIsModalOpen(true)} className="cz-hero">
          <div className="flex items-center gap-4">
            <span className="cz-hero__icon">
              <AlertTriangle size={22} />
            </span>
            <div>
              <span className="cz-hero__eyebrow">No sign-in needed</span>
              <h2>Report an emergency</h2>
              <p>Auto location and disaster type. Sent straight to dispatch.</p>
            </div>
          </div>
          <span className="cz-hero__cta">Open →</span>
        </button>

        <Link href="/citizen/volunteer" className="cz-hero cz-hero--secondary">
          <div className="flex items-center gap-4">
            <span className="cz-hero__icon">
              <HandHeart size={22} />
            </span>
            <div>
              <span className="cz-hero__eyebrow">Community pool</span>
              <h2>Pledge a resource</h2>
              <p>Boats, vehicles, shelter space, or your time.</p>
            </div>
          </div>
          <span className="cz-hero__cta">Add →</span>
        </Link>
      </div>

      {error && (
        <div className="adm-note" style={{ borderLeftColor: "var(--c-red)", marginBottom: 16 }}>
          <AlertTriangle size={16} style={{ color: "var(--c-red)" }} />
          <span>{error}</span>
        </div>
      )}

      {submittedReport && (
        <div style={{ marginBottom: 24 }}>
          <div className={`cz-track ${trackModifier}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3>{submittedReport.status === "cancelled" ? "Report cancelled" : "Report active"}</h3>
                  {submittedReport.status === "cancelled" ? (
                    <span className="adm-status adm-status--mute">Cancelled</span>
                  ) : dispatched ? (
                    <span className="adm-status adm-status--green">
                      <CheckCircle2 size={11} /> Rescuer dispatched
                    </span>
                  ) : submittedReport.status === "verified" ? (
                    <span className="adm-status adm-status--blue">Verified</span>
                  ) : (
                    <span className="adm-status adm-status--amber">Awaiting review</span>
                  )}
                </div>
                <p>
                  Reference <code>{submittedReport.id}</code>
                </p>
                <p>
                  {dispatched && submittedReport.assigned_rescuer
                    ? `${submittedReport.assigned_rescuer.name} (${submittedReport.assigned_rescuer.callsign}) is en route to your location.`
                    : "On the dispatch map. If review is delayed, the nearest available rescuer is auto-routed."}
                </p>
                <div className="cz-steps">
                  <span className="done">Submitted</span>
                  <span className={submittedReport.status !== "unverified" ? "done" : ""}>Verified</span>
                  <span className={dispatched ? "active" : ""}>Dispatched</span>
                  <span className={submittedReport.status === "resolved" ? "done" : ""}>Resolved</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {reportOpen &&
                  (canResend ? (
                    <button
                      type="button"
                      onClick={handleResendSos}
                      disabled={resending}
                      className="adm-btn adm-btn--danger"
                    >
                      <Send size={13} />
                      {resending ? "Re-sending…" : "Resend SOS"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="adm-btn"
                      title="You can re-send an SOS 5 minutes after the last one"
                    >
                      <Send size={13} />
                      Resend in {resendCountdown}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => handleShareSafeLink(submittedReport)}
                  className="adm-btn"
                >
                  <Share2 size={13} />
                  {safeLinkCopied ? "Link copied" : "Share “I’m safe” link"}
                </button>
                <Link href="/citizen/history" className="adm-btn">
                  Status →
                </Link>
                {reportOpen && (
                  <button
                    type="button"
                    onClick={handleCancelSos}
                    disabled={cancelling}
                    className="adm-btn adm-btn--danger"
                  >
                    <X size={13} />
                    {cancelling ? t.cancelling : t.cancelSos}
                  </button>
                )}
              </div>
            </div>

            {sosAborted && (
              <div className="adm-note" style={{ marginTop: 14, borderLeftColor: "var(--c-green)" }}>
                <CheckCircle2 size={14} /> <span>{t.sosAborted}</span>
              </div>
            )}

            {safeShareUrl && (
              <div
                className="adm-note"
                style={{ marginTop: 14, flexDirection: "column", alignItems: "stretch", gap: 8 }}
              >
                <span style={{ fontWeight: 600 }}>
                  {safeLinkCopied ? "Link copied — share it with family:" : "Your safe check-in link:"}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    readOnly
                    value={safeShareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    style={{
                      flex: 1,
                      minWidth: 220,
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 12,
                      padding: "8px 10px",
                      border: "1px solid var(--c-line, #d5dbe3)",
                      background: "#fff",
                      color: "var(--c-ink, #0f1b2d)",
                    }}
                  />
                  <button
                    type="button"
                    className="adm-btn"
                    onClick={async () => {
                      const ok = await shareOrCopyLink({ url: safeShareUrl });
                      if (ok !== "manual") {
                        setSafeLinkCopied(true);
                        setTimeout(() => setSafeLinkCopied(false), 2500);
                      }
                    }}
                  >
                    <Share2 size={13} /> Copy
                  </button>
                  <a href={safeShareUrl} target="_blank" rel="noopener noreferrer" className="adm-btn">
                    Open ↗
                  </a>
                </div>
              </div>
            )}
          </div>
          <CitizenLiveTrackingMap incident={submittedReport} onIncidentUpdated={setSubmittedReport} />
        </div>
      )}

      {isModalOpen && (
        <div className="cz-modal" onClick={() => setIsModalOpen(false)}>
          <div className="cz-modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="cz-modal__head">
              <div>
                <h3>Report an emergency</h3>
                <span>Your live location is used to route the nearest responder.</span>
              </div>
              <button type="button" className="cz-modal__close" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="cz-modal__body">
              {activeExistingReport ? (
                <>
                  <div className="adm-note">
                    <AlertTriangle size={16} />
                    <span>
                      A report (<strong>{activeExistingReport.id}</strong>) is already active for this
                      device. Only one report can run at a time — use{" "}
                      <strong>Resend SOS</strong> on the report card if your situation is still ongoing.
                    </span>
                  </div>
                  {reportOpen && canResend && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        handleResendSos();
                      }}
                      disabled={resending}
                      className="adm-btn adm-btn--danger"
                      style={{ justifyContent: "center" }}
                    >
                      <Send size={13} />
                      {resending ? "Re-sending…" : "Resend SOS now"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="adm-btn adm-btn--primary"
                    style={{ justifyContent: "center" }}
                  >
                    Track current report
                  </button>
                </>
              ) : (
                <form onSubmit={handleSubmit} className="cz-modal__body" style={{ padding: 0 }}>
                  <label className="adm-field">
                    <span>
                      <MapPin size={13} /> Location
                    </span>
                    <input
                      name="location"
                      required
                      placeholder="Address or landmark"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleDetectGPS}
                      disabled={gpsLoading}
                      className="adm-btn"
                      style={{ marginTop: 10, width: "100%", justifyContent: "center" }}
                    >
                      <Navigation size={13} />
                      {gpsLoading ? "Detecting…" : "Use current location"}
                    </button>
                  </label>

                  <div className="adm-kv">
                    <span>Region</span>
                    <strong>{regionName}</strong>
                  </div>
                  <div className="adm-kv">
                    <span>Coordinates</span>
                    <strong style={{ fontFamily: "ui-monospace, monospace" }}>
                      {lat}, {lng}
                    </strong>
                  </div>

                  <label className="adm-field">
                    <span>Type</span>
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

                  <div className="cz-modal__actions">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="adm-btn">
                      Cancel
                    </button>
                    <button type="submit" disabled={loading} className="adm-btn adm-btn--danger">
                      <Send size={14} />
                      {loading ? "Sending…" : "Send report"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}