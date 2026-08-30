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

export interface ResponseTeamRequest {
  id: string;
  unitId: string;
  unitName: string;
  callsign: string;
  requestType: "supplies" | "equipment" | "reinforcement" | "medical_evac" | "transport";
  title: string;
  details: string;
  urgency: "critical" | "high" | "moderate";
  status: "pending" | "approved" | "dispatched" | "fulfilled";
  requestedAt: string;
  lat: number;
  lng: number;
  locationName: string;
}

export interface CitizenResponse {
  id: string;
  reportId: string;
  citizenName: string;
  phone: string;
  status: "immediate_help" | "trapped" | "medical_need" | "safe" | "supply_needed";
  message: string;
  peopleCount: number;
  timestamp: string;
  lat: number;
  lng: number;
  locationName: string;
  isRadicalRegion: boolean;
  autoAlertTriggered: boolean;
}

export interface RadicalRegionRule {
  id: string;
  regionName: string;
  riskLevel: "extreme_radical" | "high_risk" | "moderate_risk";
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  autoBroadcastSosToRescuers: boolean;
  autoDispatchThreshold: number;
  rescuerAuthorityLevel: "level_1_autonomous" | "level_2_field_resource" | "level_3_command_approval";
  enabled: boolean;
  activeAlertsCount: number;
}

export interface PredeterminedPermissionSettings {
  globalAutoDispatchEnabled: boolean;
  radicalRegionsAutoAlertEnabled: boolean;
  minReportClusterForAutoDispatch: number;
  maxAutoDispatchRadiusKm: number;
  requireAdminPostConfirmation: boolean;
  regions: RadicalRegionRule[];
}

export interface HeadResourceEstimation {
  id: string;
  incidentId: string;
  unitId: string;
  leaderName: string;
  locationName: string;
  areaRadiusKm: number;
  totalRequestsCount: number;
  totalPeopleCount: number;
  estimatedFoodKits: number;
  estimatedWaterLiters: number;
  estimatedMedicalKits: number;
  estimatedLifeJackets: number;
  estimatedFuelLiters: number;
  specialEquipment: string;
  setAt: string;
  status: "draft" | "confirmed_broadcast";
}

