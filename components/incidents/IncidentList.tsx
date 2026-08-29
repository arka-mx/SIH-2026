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
      <div className="p-8 text-center bg-white rounded-xl border border-stone-200 text-stone-400 text-sm">
        No incidents found in this category.
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
