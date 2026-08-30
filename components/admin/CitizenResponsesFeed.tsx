"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, MapPin, Phone, Clock, Radio, HeartPulse } from "lucide-react";
import { CitizenResponse } from "@/types/rescuer";

interface CitizenResponsesFeedProps {
  responses: CitizenResponse[];
}

export function CitizenResponsesFeed({ responses }: CitizenResponsesFeedProps) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = responses.filter((c) => {
    if (filter === "trapped") return c.status === "trapped" || c.status === "immediate_help";
    if (filter === "medical") return c.status === "medical_need";
    if (filter === "radical") return c.isRadicalRegion;
    return true;
  });

  function getStatusBadge(status: string) {
    switch (status) {
      case "trapped":
      case "immediate_help":
        return (
          <span className="adm-status adm-status--red">
            <AlertTriangle size={11} /> Trapped
          </span>
        );
      case "medical_need":
        return (
          <span className="adm-status adm-status--amber">
            <HeartPulse size={11} /> Medical
          </span>
        );
      case "safe":
        return (
          <span className="adm-status adm-status--green">
            <CheckCircle2 size={11} /> Safe
          </span>
        );
      default:
        return <span className="adm-status adm-status--mute">Update</span>;
    }
  }

  const urgentCount = responses.filter(
    (r) => r.status === "trapped" || r.status === "immediate_help"
  ).length;

  return (
    <div className="adm-card space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3 pb-4 border-b border-slate-200">
        <h2 className="section-title">
          Citizen SOS
          <span className="ml-2 text-xs font-mono font-bold text-slate-400">{urgentCount} urgent</span>
        </h2>

        <div className="adm-segment">
          {[
            { key: "all", label: `All (${responses.length})` },
            { key: "trapped", label: "Trapped" },
            { key: "medical", label: "Medical" },
            { key: "radical", label: "High-risk" },
          ].map((f) => (
            <button key={f.key} data-active={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400">None</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`border border-slate-200 border-l-[3px] p-3.5 ${
                item.isRadicalRegion
                  ? "border-l-[color:var(--a-accent)]"
                  : item.status === "trapped"
                  ? "border-l-red-600"
                  : "border-l-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-sm text-slate-900 font-bold">
                      {item.citizenName}
                      <span className="ml-1.5 text-xs text-slate-500 font-normal">
                        ({item.peopleCount} {item.peopleCount === 1 ? "person" : "people"})
                      </span>
                    </strong>
                    <span className="font-mono text-[11px] text-slate-400">#{item.id}</span>
                    {item.isRadicalRegion && (
                      <span className="adm-status adm-status--mute">High-risk</span>
                    )}
                    {item.autoAlertTriggered && (
                      <span className="adm-status adm-status--green">
                        <Radio size={10} /> Alerted
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 mt-1.5 bg-slate-50 border border-slate-200 p-2">
                    “{item.message}”
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <Phone size={12} /> {item.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {item.locationName}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock size={11} />{" "}
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  {getStatusBadge(item.status)}
                  <span className="adm-status adm-status--mute">
                    {item.channel === "sms" ? "SMS" : item.channel === "ivr" ? "IVR" : "Web"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
