export type ResourceStatus = "Available" | "En route" | "At scene" | "Unavailable";

export interface Resource {
  id: string;
  name: string;
  type: string;
  total: number;
  currentlyUsed: number;
  unit: string;
  status: ResourceStatus;
  location: string;
  latitude: number;
  longitude: number;
  disasterTypes: string[];
}
