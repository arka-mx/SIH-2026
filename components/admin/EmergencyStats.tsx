import { Activity, AlertTriangle, MapPin, Siren, CheckCircle } from "lucide-react";
import { ReportItem } from "@/lib/api";

export function EmergencyStats({ incidents = [] }: { incidents?: ReportItem[] }) {
  const verifiedCount = incidents.filter((i) => i.status === "verified").length;
  const inProgressCount = incidents.filter((i) => i.status === "in_progress").length;
  const resolvedCount = incidents.filter((i) => i.status === "resolved").length;
  const unverifiedCount = incidents.filter((i) => i.status === "unverified").length;

  return (
    <div className="emergency-bar">
      <div>
        <span className="emergency-kicker">
          <Siren size={14} /> Active Emergency Response Hub
        </span>
        <strong>
          <MapPin size={15} /> Mumbai / Multi-District Command Center
        </strong>
      </div>
      <div className="emergency-metrics">
        <span>
          <AlertTriangle size={15} className="text-amber-500" />
          {unverifiedCount} <small>Unverified</small>
        </span>
        <span>
          <Activity size={15} className="text-emerald-600" />
          {verifiedCount} <small>Verified</small>
        </span>
        <span>
          <Activity size={15} className="text-blue-600" />
          {inProgressCount} <small>In Progress</small>
        </span>
        <span>
          <CheckCircle size={15} className="text-stone-500" />
          {resolvedCount} <small>Resolved</small>
        </span>
      </div>
    </div>
  );
}
