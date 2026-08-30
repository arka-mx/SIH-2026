"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { QrCode } from "@/components/ui/QrCode";
import { Printer, Download, Copy, Check } from "lucide-react";

type Purpose = "report" | "help";
type Paper = "a4" | "a5";

const PURPOSE = {
  report: {
    path: "/citizen",
    title: "NEED HELP?",
    en: "Report a flood, fire or medical emergency. Your location is shared with responders.",
    hi: "आपात स्थिति की सूचना दें — आपका स्थान राहत दल को भेजा जाएगा।",
  },
  help: {
    path: "/citizen/volunteer",
    title: "CAN YOU HELP?",
    en: "Offer a boat, vehicle, shelter space or supplies to people nearby.",
    hi: "नाव, वाहन, आश्रय या राहत सामग्री की पेशकश करें।",
  },
} satisfies Record<Purpose, { path: string; title: string; en: string; hi: string }>;

function slug(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function PostersPage() {
  const [shelter, setShelter] = useState("Dharavi Community Camp");
  const [district, setDistrict] = useState("Mumbai Central");
  const [purpose, setPurpose] = useState<Purpose>("report");
  const [paper, setPaper] = useState<Paper>("a4");
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // "" during SSR and first client render, real origin after mount — no hydration mismatch.
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  );

  const url = useMemo(() => {
    const params = new URLSearchParams({ src: "poster" });
    const loc = [shelter, district].filter(Boolean).join(", ");
    if (loc) params.set("loc", loc);
    const ref = slug(shelter);
    if (ref) params.set("ref", ref);
    return `${origin}${PURPOSE[purpose].path}?${params.toString()}`;
  }, [origin, purpose, shelter, district]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  function downloadSvg() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const blob = new Blob([clone.outerHTML], { type: "image/svg+xml" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `qr-${slug(shelter) || "poster"}.svg`;
    a.click();
    URL.revokeObjectURL(href);
  }

  const p = PURPOSE[purpose];

  return (
    <AdminShell>
      <div className="posters-layout">
        <div className="print:hidden">
          <div className="page-heading">
            <h1>Posters</h1>
            <button onClick={() => window.print()} className="adm-btn adm-btn--primary">
              <Printer size={15} /> Print
            </button>
          </div>

          <div className="adm-card adm-card--plain poster-form">
            <label>
              <span>Shelter or camp</span>
              <input value={shelter} onChange={(e) => setShelter(e.target.value)} placeholder="Community camp" />
            </label>

            <label>
              <span>District</span>
              <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="District" />
            </label>

            <div className="poster-form__group">
              <span>Poster for</span>
              <div className="seg">
                <button data-active={purpose === "report"} onClick={() => setPurpose("report")}>Emergency</button>
                <button data-active={purpose === "help"} onClick={() => setPurpose("help")}>Offer help</button>
              </div>
            </div>

            <div className="poster-form__group">
              <span>Paper</span>
              <div className="seg">
                <button data-active={paper === "a4"} onClick={() => setPaper("a4")}>A4</button>
                <button data-active={paper === "a5"} onClick={() => setPaper("a5")}>A5</button>
              </div>
            </div>

            <div className="poster-form__link">
              <code>{url}</code>
              <div className="poster-form__actions">
                <button onClick={copyLink} className="adm-btn">
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
                </button>
                <button onClick={downloadSvg} className="adm-btn">
                  <Download size={13} /> QR
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="posters-stage">
          <div className={`poster poster--${paper}`}>
            <div className="poster__rule" />
            <div className="poster__body">
              <p className="poster__kicker">No login needed</p>
              <h2 className="poster__title">{p.title}</h2>
              <p className="poster__where">
                {shelter}
                {district ? ` · ${district}` : ""}
              </p>

              <div className="poster__qr" ref={qrRef}>
                <QrCode value={url} size={300} ecc="QUARTILE" />
              </div>

              <p className="poster__scan">Scan with any phone camera</p>
              <p className="poster__desc">{p.en}</p>
              <p className="poster__hi" lang="hi">{p.hi}</p>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
