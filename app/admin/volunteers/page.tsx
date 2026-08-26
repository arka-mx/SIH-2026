import { mockVolunteers } from "@/data/mockVolunteers";
import { AdminShell } from "@/components/layout/AdminShell";
import { VolunteerCard } from "@/components/volunteers/VolunteerCard";

export default function VolunteersPage() {
  return <AdminShell><div className="page-heading"><div><p className="eyebrow">People network</p><h1>Volunteer requests</h1></div><span className="login-note">{mockVolunteers.length} active requests</span></div><div className="resource-grid">{mockVolunteers.map((volunteer) => <VolunteerCard key={volunteer.id} volunteer={volunteer} />)}</div></AdminShell>;
}
