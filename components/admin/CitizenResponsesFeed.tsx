"use client";

import { useState } from "react";
import { 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  Clock, 
  Radio, 
  Zap, 
  ShieldAlert, 
  HeartPulse 
} from "lucide-react";
import { CitizenResponse } from "@/types/rescuer";

interface CitizenResponsesFeedProps {
  responses: CitizenResponse[];
}

export function CitizenResponsesFeed({ responses }: CitizenResponsesFeedProps) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = responses.filter((c) => {
    if (filter === "all") return true;
    if (filter === "trapped") return c.status === "trapped" || c.status === "immediate_help";
    if (filter === "medical") return c.status === "medical_need";
    if (filter === "radical") return c.isRadicalRegion;
    return true;
  });

  function getStatusBadge(status: string) {
    switch (status) {
      case "trapped":
      case "immediate_help":
        return <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider animate-pulse"><AlertTriangle size={10} /> Trapped / Immediate SOS</span>;
      case "medical_need":
        return <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider"><HeartPulse size={10} /> Medical Emergency</span>;
      case "safe":
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider"><CheckCircle2 size={10} /> Confirmed Safe</span>;
      default:
        return <span className="bg-stone-100 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded">Update</span>;
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-stone-100">
        <div>
          <span className="eyebrow uppercase text-[11px] text-stone-500 font-bold tracking-wider">Citizen Feedback & Field Telemetry</span>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Users size={18} className="text-emerald-600" /> Citizen Responses & SOS Feed
            <span className="bg-emerald-100 text-emerald-800 font-mono text-xs px-2 py-0.5 rounded-full font-bold">
              {responses.filter(r => r.status === "trapped" || r.status === "immediate_help").length} Urgent
            </span>
          </h2>
        </div>

        <div className="flex bg-stone-100 p-0.5 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-md transition-all ${filter === "all" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500"}`}
          >
            All ({responses.length})
          </button>
          <button
            onClick={() => setFilter("trapped")}
            className={`px-2.5 py-1 rounded-md transition-all ${filter === "trapped" ? "bg-rose-600 text-white shadow-2xs" : "text-stone-500"}`}
          >
            Trapped SOS
          </button>
          <button
            onClick={() => setFilter("medical")}
            className={`px-2.5 py-1 rounded-md transition-all ${filter === "medical" ? "bg-amber-500 text-white shadow-2xs" : "text-stone-500"}`}
          >
            Medical
          </button>
          <button
            onClick={() => setFilter("radical")}
            className={`px-2.5 py-1 rounded-md transition-all ${filter === "radical" ? "bg-purple-600 text-white shadow-2xs" : "text-stone-500"}`}
          >
            Radical Zones
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-6 text-center text-xs text-stone-400">
          No citizen responses found matching filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all ${
                item.isRadicalRegion
                  ? "bg-purple-50/50 border-purple-200"
                  : item.status === "trapped"
                  ? "bg-rose-50/40 border-rose-200"
                  : "bg-stone-50/60 border-stone-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-sm text-stone-900 font-bold flex items-center gap-1.5">
                      {item.citizenName}
                      <span className="text-xs text-stone-500 font-normal">({item.peopleCount} {item.peopleCount === 1 ? 'person' : 'people'})</span>
                    </strong>
                    <span className="font-mono text-[11px] text-stone-400">#{item.id}</span>
                    {item.isRadicalRegion && (
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Zap size={10} className="text-purple-600" /> High-Risk Radical Region
                      </span>
                    )}
                    {item.autoAlertTriggered && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Radio size={10} className="text-emerald-600" /> Auto-Alerted Rescuers
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-800 font-medium mt-1.5 bg-white/80 p-2 rounded-lg border border-stone-200/80">
                    "{item.message}"
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-stone-500 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-stone-700 font-medium">
                      <Phone size={12} className="text-blue-600" /> {item.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-rose-500" /> {item.locationName}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-stone-400">
                      <Clock size={11} /> {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  {getStatusBadge(item.status)}
                  {item.channel === "sms" && (
                    <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      📶 SMS Fallback
                    </span>
                  )}
                  {item.channel === "ivr" && (
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      📞 IVR Gateway
                    </span>
                  )}
                  {(!item.channel || item.channel === "web") && (
                    <span className="bg-stone-50 text-stone-600 border border-stone-200 text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1">
                      🌐 Web Portal
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
