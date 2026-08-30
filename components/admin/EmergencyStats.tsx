import { Siren } from "lucide-react";
import { ReportItem } from "@/lib/api";
import { AdminLocationControl } from "@/components/admin/AdminLocationControl";

export function EmergencyStats({ incidents = [] }: { incidents?: ReportItem[] }) {
  const verifiedCount = incidents.filter((i) => i.status === "verified").length;
  const inProgressCount = incidents.filter((i) => i.status === "in_progress").length;
  const resolvedCount = incidents.filter((i) => i.status === "resolved").length;
  const unverifiedCount = incidents.filter((i) => i.status === "unverified").length;

  return (
    <div className="emergency-bar">
      <div>
        <span className="emergency-kicker">
          <Siren size={14} /> Active
        </span>
        <div className="emergency-place">
          <AdminLocationControl />
        </div>
      </div>
      <div className="emergency-metrics">
        <span>
          {unverifiedCount} <small>Unverified</small>
        </span>
        <span>
          {verifiedCount} <small>Verified</small>
        </span>
        <span>
          {inProgressCount} <small>In progress</small>
        </span>
        <span>
          {resolvedCount} <small>Resolved</small>
        </span>
      </div>
    </div>
  );
}
