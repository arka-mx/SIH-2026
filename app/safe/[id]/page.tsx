import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Heart,
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
    return { title: "Safety check-in not found | Momentum" };
  }
  const headline = status.reportedSafe
    ? "Reported safe"
    : status.status === "in_progress"
    ? "Rescue team dispatched"
    : "Location shared";
  const title = `${headline} · ${status.locationLabel} | Momentum`;
  const description = `Live safety check-in shared via the Momentum disaster response network. Refresh for the latest status.`;
  return {
    title,
    description,
    openGraph: { title, description },
    robots: { index: false, follow: false },
  };
}

type Presentation = {
  wrap: string;
  badgeDot: string;
  label: string;
  sub: string;
  Icon: typeof CheckCircle2;
};

function present(status: SafeStatusView): Presentation {
  if (status.reportedSafe && status.status !== "in_progress") {
    return {
      wrap: "from-emerald-600 to-teal-700",
      badgeDot: "bg-emerald-300",
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
      wrap: "from-sky-600 to-blue-700",
      badgeDot: "bg-sky-300",
      label: "Rescue team dispatched",
      sub: status.rescuer
        ? `${status.rescuer.label} is responding to this location.`
        : "A rescue team is en route to this location.",
      Icon: Ambulance,
    };
  }
  if (status.status === "resolved") {
    return {
      wrap: "from-emerald-600 to-teal-700",
      badgeDot: "bg-emerald-300",
      label: "Incident resolved",
      sub: "Responders have closed out this incident.",
      Icon: CheckCircle2,
    };
  }
  if (status.status === "cancelled") {
    return {
      wrap: "from-stone-500 to-stone-700",
      badgeDot: "bg-stone-300",
      label: "Check-in withdrawn",
      sub: "This check-in was cancelled by the person who filed it.",
      Icon: AlertTriangle,
    };
  }
  return {
    wrap: "from-amber-500 to-orange-700",
    badgeDot: "bg-amber-200",
    label: "Location shared · awaiting response",
    sub: "This person shared their location. Responders have not confirmed contact yet.",
    Icon: Activity,
  };
}

function NotFound() {
  return (
    <main className="public-home theme-light">
      <BackButton />
      <section className="max-w-md mx-auto my-12 p-8 bg-white/80 backdrop-blur-md border border-[#e3cda9] rounded-2xl shadow-xl text-center">
        <AlertTriangle size={48} className="mx-auto text-amber-600 mb-4" />
        <h1 className="text-xl font-bold text-stone-900">Safety check-in not found</h1>
        <p className="text-sm text-stone-600 mt-2">
          This safety link is invalid, or the check-in it pointed to is no longer available.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center min-h-10 px-5 py-2 bg-[#3b76a3] text-white text-xs font-bold rounded-lg shadow-md hover:bg-[#2d5d82] transition-colors"
        >
          Return to homepage
        </Link>
      </section>
    </main>
  );
}

export default async function SafeStatusPage({ params }: PageProps) {
  const { id } = await params;
  const status = await resolveSafeStatus(id);

  if (!status) return <NotFound />;

  const p = present(status);
  const hasCoords = Number.isFinite(status.lat) && Number.isFinite(status.lng) && (status.lat !== 0 || status.lng !== 0);
  const created = new Date(status.createdAt);
  const updated = new Date(status.updatedAt);
  const delta = 0.01;
  const bbox = hasCoords
    ? `${status.lng - delta}%2C${status.lat - delta}%2C${status.lng + delta}%2C${status.lat + delta}`
    : null;

  return (
    <main className="public-home theme-light min-h-screen">
      <BackButton />
      <section className="max-w-2xl mx-auto my-10 px-4">
        {/* Status banner */}
        <div
          className={`bg-linear-to-r ${p.wrap} text-white p-6 rounded-3xl mb-6 shadow-md border border-white/10 text-center relative overflow-hidden`}
        >
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10">
            <Heart size={160} />
          </div>

          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full mb-3 shadow-inner">
            <p.Icon size={32} className="text-white" />
          </div>
          <p className="text-[10px] tracking-[0.2em] font-extrabold uppercase text-white/80">
            Momentum Safety Network
          </p>
          <h1 className="text-2xl font-black tracking-tight mt-1 text-white">{p.label}</h1>
          <p className="text-xs text-white/85 mt-2 max-w-sm mx-auto leading-relaxed">{p.sub}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-xs text-xs font-bold rounded-full">
            <span className={`w-2.5 h-2.5 ${p.badgeDot} rounded-full animate-ping`} />
            Updated {updated.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
          </div>
        </div>

        {/* Details card */}
        <div className="bg-white/95 backdrop-blur-md border border-[#e3cda9] p-6 rounded-3xl shadow-lg space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block">
                Check-in reference
              </span>
              <span className="font-mono text-sm font-bold text-stone-900 block mt-0.5">#{status.id}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block">
                Situation
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-md inline-block mt-0.5">
                {status.type}
              </span>
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/50 flex gap-3">
              <MapPin size={18} className="text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block">
                  Last known location
                </span>
                <span className="text-xs font-bold text-stone-800 block mt-1 leading-relaxed">
                  {status.locationLabel}
                </span>
              </div>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/50 flex gap-3">
              <Compass size={18} className="text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block">
                  Coordinates (GPS)
                </span>
                <span className="text-xs font-mono font-bold text-stone-800 block mt-1">
                  {hasCoords ? (
                    <>
                      Lat: {status.lat.toFixed(6)}
                      <br />
                      Lng: {status.lng.toFixed(6)}
                    </>
                  ) : (
                    "Not shared"
                  )}
                </span>
              </div>
            </div>
          </div>

          {bbox && (
            <div className="rounded-2xl overflow-hidden border border-stone-200">
              <iframe
                title="Location map"
                className="w-full h-56"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${status.lat}%2C${status.lng}`}
              />
              <a
                href={`https://www.openstreetmap.org/?mlat=${status.lat}&mlon=${status.lng}#map=15/${status.lat}/${status.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-[11px] font-bold text-[#3b76a3] bg-stone-50 py-1.5 hover:bg-stone-100"
              >
                Open full map ↗
              </a>
            </div>
          )}

          {status.note && (
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/40">
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                Check-in details
              </span>
              <p className="text-xs font-bold text-stone-800 mt-2 leading-relaxed">{status.note}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-semibold text-stone-500 pt-2 px-1">
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              Filed {created.toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="flex items-center gap-1 text-emerald-700">
              <ShieldCheck size={13} />
              Shared by the person who filed it
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center space-y-3">
          <AutoRefresh seconds={45} />
          <p className="text-[10px] text-stone-500 font-medium max-w-sm mx-auto leading-relaxed">
            This page is generated by the Momentum disaster command center so family and friends can
            check in on someone&apos;s status without adding load to emergency phone lines. It updates
            automatically as responders act.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-[#3b76a3] hover:text-[#2d5d82] font-extrabold"
          >
            ← Momentum public portal
          </Link>
        </div>
      </section>
    </main>
  );
}
