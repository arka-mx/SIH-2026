"use client";

import { useState } from "react";
import { MapPin, UserRound } from "lucide-react";
import { Incident } from "@/types/incident";
import { Badge } from "@/components/ui/Badge";

export function IncidentCard({ incident }: { incident: Incident }) {
  const [action, setAction] = useState<string>("");
  const help = action === "help";
  const ignored = action === "ignore";
  return <article className={`incident-card ${ignored ? "muted-card" : ""}`}><div className="flex items-start justify-between gap-3"><div><div className="mb-1 flex items-center gap-2"><span className="text-sm font-bold text-[#1b3324]">{incident.disasterType}</span><Badge tone={incident.status === "verified" ? "green" : "amber"}>{incident.status}</Badge></div><p className="flex items-center gap-1 text-xs text-[#607466]"><MapPin size={13} />{incident.location}</p></div><span className="text-[10px] font-bold text-[#819185]">{incident.id}</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4"><span><b className="block text-base text-[#1b3324]">{incident.injured}</b>Injured</span><span><b className="block text-base text-[#1b3324]">{incident.casualties}</b>Casualties</span><span className="col-span-2"><b className="flex items-center gap-1 text-[#1b3324]"><UserRound size={13} />{incident.reporterName}</b>{incident.timestamp}</span></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#dbe5d8] pt-3"><Badge tone={incident.reporterStatus === "immediate_help" ? "red" : "green"}>{incident.reporterStatus === "immediate_help" ? "Immediate help requested" : "Safe"}</Badge><div className="flex gap-2">{help || ignored ? <button className="action-button" disabled>{help ? "Help sent" : "Ignored"}</button> : <><button onClick={() => setAction("help")} className="action-button primary">Send help</button><button onClick={() => setAction("ignore")} className="action-button">Ignore</button></>}</div></div></article>;
}
