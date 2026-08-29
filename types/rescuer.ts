export interface RescuerSupply {
  foodRationKits: number;
  foodRationCapacity: number;
  waterLiters: number;
  waterCapacityLiters: number;
  medicalKits: number;
  medicalKitsCapacity: number;
  ivFluidsCount: number;
  shelterBedsAvailable: number;
  shelterBedsTotal: number;
  lifeJackets: number;
  fuelLiters: number;
  satPhoneBatteryPct: number;
}

export interface RescuerUnitProfile {
  id: string;
  name: string;
  callsign: string;
  type: "rescue_team" | "boat" | "ambulance" | "shelter" | "medical_van";
  leaderName: string;
  phone: string;
  status: "available" | "en_route" | "at_scene" | "resting";
  lat: number;
  lng: number;
  assignedReportId?: string | null;
  assignmentSource?: "admin_dispatch" | "nearest_fallback" | null;
  supplies: RescuerSupply;
}
