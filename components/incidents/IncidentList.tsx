import { Incident } from "@/types/incident";
import { IncidentCard } from "@/components/incidents/IncidentCard";

export function IncidentList({ incidents, compact = false }: { incidents: Incident[]; compact?: boolean }) {
  return <div className={`incident-list ${compact ? "compact-list" : ""}`}>{incidents.map((incident) => <IncidentCard key={incident.id} incident={incident} />)}</div>;
}
