export type ResourceStatus = "Available" | "En route" | "At scene" | "Unavailable";

export interface Resource {
  id: string;
  type: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  total: number;
  currentlyUsed: number;
  unit: string;
  status: ResourceStatus;
  disasterTypes: string[];
}
