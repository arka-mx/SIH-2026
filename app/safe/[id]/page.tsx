import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Calendar,
  Compass,
  Ambulance,
} from "lucide-react";
import { BackButton } from "@/components/public/BackButton";
import { AutoRefresh } from "@/components/public/AutoRefresh";
import { resolveSafeStatus as resolveSafeStatusUncached, SafeStatusView } from "@/lib/safeStatus";

export const dynamic = "force-dynamic";

/** Dedupe the lookup shared by generateMetadata and the page body within one request. */
const resolveSafeStatus = cache(resolveSafeStatusUncached);

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const status = await resolveSafeStatus(id);
  if (!status) {
    return { title: "Safety check-in not found | Sanket" };
  }
  const headline = status.reportedSafe
    ? "Reported safe"
    : status.status === "in_progress"
    ? "Rescue team dispatched"
    : "Location shared";
  const title = `${headline} · ${status.locationLabel} | Sanket`;
  const description = `Live safety check-in shared via the Sanket disaster response network. Refresh for the latest status.`;
  return {
    title,
    description,
    openGraph: { title, description },
    robots: { index: false, follow: false },
  };
}

type Tone = "green" | "blue" | "amber" | "mute";

type Presentation = {
  tone: Tone;
  label: string;
  sub: string;
  Icon: typeof CheckCircle2;
};

function present(status: SafeStatusView): Presentation {
  if (status.reportedSafe && status.status !== "in_progress") {
    return {
      tone: "green",
      label: "Reported safe",
      sub:
        status.status === "resolved"
          ? "The incident has been resolved by responders."
          : "This person marked themselves as safe when checking in.",
      Icon: CheckCircle2,
    };
  }
  if (status.status === "in_progress") {
    return {
      tone: "blue",
      label: "Rescue team dispatched",
      sub: status.rescuer
        ? `${status.rescuer.label} is responding to this location.`
        : "A rescue team is en route to this location.",
      Icon: Ambulance,
    };
  }
  if (status.status === "resolved") {
    return {
      tone: "green",
      label: "Incident resolved",
      sub: "Responders have closed out this incident.",
      Icon: CheckCircle2,
    };
  }
  if (status.status === "cancelled") {
    return {
      tone: "mute",
      label: "Check-in withdrawn",
      sub: "This check-in was cancelled by the person who filed it.",
      Icon: AlertTriangle,
    };
  }
  return {
    tone: "amber",
    label: "Location shared · awaiting response",
    sub: "This person shared their location. Responders have not confirmed contact yet.",
    Icon: Activity,
  };
}

function NotFound() {
  return (
    <main className="public-home theme-light">
      <BackButton />
      <div className="safe-view">
        <section className="safe-card safe-card--amber safe-card--center">
          <span className="safe-banner__icon">
            <AlertTriangle size={22} />
          </span>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>Safety check-in not found</h1>
          <p style={{ margin: 0, color: "var(--ph-ink-soft)", fontSize: 13, lineHeight: 1.55, maxWidth: 360 }}>
            This safety link is invalid, or the check-in it pointed to is no longer available.
          </p>
          <Link href="/" className="safe-home-btn">
            Return to homepage
          </Link>
        </section>
      </div>
    </main>
  );
}

export default async function SafeStatusPage({ params }: PageProps) {
  const { id } = await params;
  const status = await resolveSafeStatus(id);

  if (!status) return <NotFound />;

  const p = present(status);
  const hasCoords =
    Number.isFinite(status.lat) && Number.isFinite(status.lng) && (status.lat !== 0 || status.lng !== 0);
  const created = new Date(status.createdAt);
  const updated = new Date(status.updatedAt);
  const delta = 0.01;
  const bbox = hasCoords
    ? `${status.lng - delta}%2C${status.lat - delta}%2C${status.lng + delta}%2C${status.lat + delta}`
    : null;

  return (
    <main className="public-home theme-light">
      <BackButton />

      <div className="safe-view">
        {/* Status */}
        <section className={`safe-card safe-card--${p.tone}`}>
          <div className="safe-banner">
            <div className="safe-banner__row">
              <span className="safe-banner__icon">
                <p.Icon size={22} />
              </span>
              <div>
                <p className="eyebrow">Sanket Safety Network</p>
                <h1>{p.label}</h1>
              </div>
            </div>
            <p>{p.sub}</p>
            <span className="safe-updated">
              <i />
              Updated {updated.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
        </section>

        {/* Details */}
        <section className="safe-card">
          <div className="safe-kv">
            <div>
              <span className="k">Check-in reference</span>
              <p className="v v--mono">{status.id}</p>
            </div>
            <div>
              <span className="k">Situation</span>
              <p className="v" style={{ textTransform: "capitalize" }}>
                {status.type}
              </p>
            </div>
            <div>
              <span className="k">
                <MapPin size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                Last known location
              </span>
              <p className="v">{status.locationLabel}</p>
            </div>
            <div>
              <span className="k">
                <Compass size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                Coordinates
              </span>
              <p className="v v--mono">
                {hasCoords ? `${status.lat.toFixed(6)}, ${status.lng.toFixed(6)}` : "Not shared"}
              </p>
            </div>
          </div>

          {bbox && (
            <div className="safe-map" style={{ marginTop: 16 }}>
              <iframe
                title="Location map"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${status.lat}%2C${status.lng}`}
              />
              <a
                href={`https://www.openstreetmap.org/?mlat=${status.lat}&mlon=${status.lng}#map=15/${status.lat}/${status.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open full map ↗
              </a>
            </div>
          )}

          {status.note && (
            <div className="safe-note" style={{ marginTop: 16 }}>
              <span className="k">Check-in details</span>
              <p>{status.note}</p>
            </div>
          )}

          <div className="safe-meta" style={{ marginTop: 16 }}>
            <span>
              <Calendar size={13} />
              Filed {created.toLocaleDateString()}
            </span>
            <span>
              <Clock size={13} />
              {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span style={{ color: "var(--ph-green)" }}>
              <ShieldCheck size={13} />
              Shared by the person who filed it
            </span>
          </div>
        </section>

        {/* Footer */}
        <div className="safe-foot">
          <AutoRefresh seconds={45} />
          <p>
            This page is generated by the Sanket disaster command center so family and friends can
            check in on someone&apos;s status without adding load to emergency phone lines. It updates
            automatically as responders act.
          </p>
          <Link href="/">← Sanket public portal</Link>
        </div>
      </div>
    </main>
  );
}
