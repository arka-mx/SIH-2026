import { mockIncidents } from "@/data/mockIncidents";
import { AdminShell } from "@/components/layout/AdminShell";
import { IncidentList } from "@/components/incidents/IncidentList";

export default function UnverifiedPage() {
  return <AdminShell><div className="page-heading"><div><p className="eyebrow">Needs review</p><h1>Unverified cases</h1></div><span className="login-note">{mockIncidents.filter((incident) => incident.status === "unverified").length} awaiting verification</span></div><IncidentList incidents={mockIncidents.filter((incident) => incident.status === "unverified")} /></AdminShell>;
}
