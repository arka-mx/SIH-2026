import { mockIncidents } from "@/data/mockIncidents";
import { mockVolunteers } from "@/data/mockVolunteers";
import { AdminShell } from "@/components/layout/AdminShell";
import { EmergencyStats } from "@/components/admin/EmergencyStats";
import { DashboardCard } from "@/components/admin/DashboardCard";
import { IncidentMap } from "@/components/incidents/IncidentMap";
import { Badge } from "@/components/ui/Badge";

export default function AdminPage() {
  const verified = mockIncidents.filter((incident) => incident.status === "verified");
  const unverified = mockIncidents.filter((incident) => incident.status === "unverified");
  return <AdminShell><EmergencyStats incidents={mockIncidents} /><div className="dashboard-grid"><IncidentMap /><div className="dashboard-side"><DashboardCard title="Unverified cases" count={unverified.length} href="/admin/unverified">{unverified.slice(0, 5).map((incident) => <div className="mini-row" key={incident.id}><div><strong>{incident.disasterType}</strong>{incident.location}</div><Badge tone="amber">New</Badge></div>)}</DashboardCard><DashboardCard title="Verified cases" count={verified.length} href="/admin/verified">{verified.slice(0, 5).map((incident) => <div className="mini-row" key={incident.id}><div><strong>{incident.disasterType}</strong>{incident.location}</div><Badge tone="green">Verified</Badge></div>)}</DashboardCard><DashboardCard title="Volunteer requests" count={mockVolunteers.length} href="/admin/volunteers">{mockVolunteers.slice(0, 5).map((volunteer) => <div className="mini-row" key={volunteer.id}><div><strong>{volunteer.name}</strong>{volunteer.service}</div><Badge tone="neutral">{volunteer.status}</Badge></div>)}</DashboardCard></div></div></AdminShell>;
}
