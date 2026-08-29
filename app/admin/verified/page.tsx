import { mockIncidents } from "@/data/mockIncidents";
import { AdminShell } from "@/components/layout/AdminShell";
import { IncidentList } from "@/components/incidents/IncidentList";

export default function VerifiedPage() {
  return <AdminShell><div className="page-heading"><div><p className="eyebrow">Incident registry</p><h1>Verified cases</h1></div><span className="login-note">{mockIncidents.filter((incident) => incident.status === "verified").length} confirmed reports</span></div><IncidentList incidents={mockIncidents.filter((incident) => incident.status === "verified")} /></AdminShell>;
}
