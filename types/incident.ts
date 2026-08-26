export type IncidentStatus = "verified" | "unverified";
export type ReporterStatus = "safe" | "immediate_help";

export interface Incident {
  id: string;
  reporterName: string;
  location: string;
  disasterType: "Flood" | "Cyclone" | "Landslide" | "Building Collapse" | "Fire";
  injured: number;
  casualties: number;
  status: IncidentStatus;
  reporterStatus: ReporterStatus;
  timestamp: string;
  coordinates: string;
}
