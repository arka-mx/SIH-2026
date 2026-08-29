import { Activity, AlertTriangle, MapPin, Siren } from "lucide-react";
import { Incident } from "@/types/incident";

export function EmergencyStats({ incidents }: { incidents: Incident[] }) {
  const injured = incidents.reduce((sum, incident) => sum + incident.injured, 0);
  const casualties = incidents.reduce((sum, incident) => sum + incident.casualties, 0);
  const location = incidents[0]?.location.split(",").pop()?.trim() ?? "District command";
  return <div className="emergency-bar"><div><span className="emergency-kicker"><Siren size={14} /> Active emergency</span><strong><MapPin size={15} /> {location} district</strong></div><div className="emergency-metrics"><span><AlertTriangle size={15} />{injured} <small>Injured</small></span><span><Activity size={15} />{casualties} <small>Casualties</small></span><span>{incidents.length} <small>Reports</small></span></div></div>;
}
