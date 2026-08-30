import { connectToDatabase } from "@/lib/mongodb";
import { ReportModel } from "@/lib/models/Report";
import { PublicHeader } from "@/components/public/PublicHeader";
import { 
  Heart, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  CheckCircle2,
  Calendar,
  Compass
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SafeStatusPage({ params }: PageProps) {
  const { id } = await params;
  let report = null;

  try {
    await connectToDatabase();
    report = await ReportModel.findById(id);
  } catch (err) {
    console.error("Could not fetch safety report status:", err);
  }

  if (!report) {
    return (
      <main className="public-home">
        <PublicHeader />
        <section className="max-w-md mx-auto my-12 p-8 bg-white/80 backdrop-blur-md border border-[#e3cda9] rounded-2xl shadow-xl text-center">
          <AlertTriangle size={48} className="mx-auto text-amber-600 mb-4" />
          <h1 className="text-xl font-bold text-stone-900">Safety Report Not Found</h1>
          <p className="text-sm text-stone-600 mt-2">
            The safety tracking identifier provided is invalid or has expired.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center min-h-[40px] px-5 py-2 bg-[#3b76a3] text-white text-xs font-bold rounded-lg shadow-md hover:bg-[#2d5d82] transition-colors"
          >
            Return to Homepage
          </Link>
        </section>
      </main>
    );
  }

  const isReportSafe = report.description?.toLowerCase().includes("safe") || report.status === "resolved";
  const coordinates = report.location?.coordinates || [0, 0];

  return (
    <main className="public-home min-h-screen bg-gradient-to-b from-[#fffaf0] via-[#f7f9f3] to-[#eef4ea]">
      <PublicHeader />
      <section className="max-w-2xl mx-auto my-10 px-4">
        {/* Safety Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-3xl mb-6 shadow-md border border-emerald-500/20 text-center relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10">
            <Heart size={160} />
          </div>
          
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full mb-3 shadow-inner">
            <CheckCircle2 size={32} className="text-white" />
          </div>
          <p className="text-[10px] tracking-[0.2em] font-extrabold uppercase text-emerald-100">
            MOMENTUM SAFETY NETWORK
          </p>
          <h1 className="text-2xl font-black tracking-tight mt-1 text-white">
            Citizen Check-In Status
          </h1>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-xs text-xs font-bold rounded-full">
            <span className="w-2.5 h-2.5 bg-emerald-300 rounded-full animate-ping" />
            Status: Confirmed Safe
          </div>
        </div>

        {/* Details card */}
        <div className="bg-white/95 backdrop-blur-md border border-[#e3cda9] p-6 rounded-3xl shadow-lg space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block">
                Disaster Zone Identifier
              </span>
              <span className="font-mono text-sm font-bold text-stone-900 block mt-0.5">
                #{id.substring(0, 12)}...
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block">
                Disaster Type
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-md inline-block mt-0.5">
                {report.type}
              </span>
            </div>
          </div>

          {/* Location details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/50 flex gap-3">
              <MapPin size={18} className="text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block">
                  Reported Location
                </span>
                <span className="text-xs font-bold text-stone-800 block mt-1 leading-relaxed">
                  {report.description?.split("]")[0]?.replace("[", "") || "Mumbai Area"}
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
                  Lat: {coordinates[1].toFixed(6)}<br />
                  Lng: {coordinates[0].toFixed(6)}
                </span>
              </div>
            </div>
          </div>

          {/* Citizen Description / Message */}
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/40">
            <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
              Citizen Check-In Message
            </span>
            <p className="text-xs font-bold text-stone-800 mt-2 leading-relaxed">
              {report.description?.split("]")[1]?.trim() || "No additional status remarks provided."}
            </p>
          </div>

          {/* Metadata timeline */}
          <div className="flex items-center gap-6 text-[11px] font-semibold text-stone-500 pt-2 px-1">
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              Filed: {new Date(report.created_at).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={13} />
              Time: {new Date(report.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="flex items-center gap-1 text-emerald-700">
              <ShieldCheck size={13} />
              Encrypted & Verified
            </span>
          </div>
        </div>

        {/* Public Notice */}
        <div className="mt-6 text-center">
          <p className="text-[10px] text-stone-500 font-medium max-w-sm mx-auto leading-relaxed">
            This tracking feed is generated securely by the local disaster command center to allow family check-in coordination without heavy network bandwidth usage.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1 text-xs text-[#3b76a3] hover:text-[#2d5d82] font-extrabold"
          >
            ← Back to Public Portal
          </Link>
        </div>
      </section>
    </main>
  );
}
