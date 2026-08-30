"use client";

import { ReportItem } from "@/lib/api";
import { IncidentCard } from "@/components/incidents/IncidentCard";

interface IncidentListProps {
  incidents: ReportItem[];
  compact?: boolean;
  onUpdate?: () => void;
}

export function IncidentList({ incidents, compact = false, onUpdate }: IncidentListProps) {
  if (!incidents || incidents.length === 0) {
    return (
      <div className="empty-state">
        <p>No incidents found in this category.</p>
      </div>
    );
  }

  return (
    <div className={`incident-list ${compact ? "compact-list" : ""}`}>
      {incidents.map((incident) => (
        <IncidentCard key={incident.id} incident={incident} onUpdate={onUpdate} />
      ))}
    </div>
  );
}
