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
  channel?: "web" | "sms" | "ivr";
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

export interface VolunteerPledge {
  id: string;
  volunteerName: string;
  contactPhone: string;
  assetType: string;
  capacity: string;
  availability: string;
  locationName: string;
  region: string;
  lat: number;
  lng: number;
  status: "pending_team_head" | "approved_by_head" | "mobilized" | "assigned_by_admin";
  assignedTeamId?: string;
  assignedTeamName?: string;
  deviceId?: string;
  submittedAt: string;
}

// ── District Head (Admin Head) Connection Directives ──
export interface DistrictHeadDirective {
  id: string;
  adminName: string;
  headUnitId: string;
  title: string;
  message: string;
  type: "order" | "notification" | "message" | "priority_dispatch";
  priority: "critical" | "high" | "normal";
  issuedAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgmentNote?: string;
  attachedResourceTarget?: {
    type: string;
    amount: number;
    unit: string;
  };
}

// ── Resource Quota Assigned to Member ──
export interface ResourceRequirementItem {
  key: string;
  name: string;
  targetAmount: number;
  gatheredAmount: number;
  unit: string;
  adminResourceName: string;
}

// ── Member Order & Ration Allocation from Rescue Team Head ──
export interface MemberOrderAllocation {
  id: string;
  teamId: string;
  teamName: string;
  headName: string;
  headPhone: string;
  headOffice: string;
  memberId: string;
  memberName: string;
  memberRole: string;
  title: string;
  instructions: string;
  status: "pending" | "gathering" | "completed";
  assignedAt: string;
  updatedAt: string;
  resources: ResourceRequirementItem[];
}

// ── Field Team Member Profile ──
export interface TeamMember {
  id: string;
  name: string;
  callsign: string;
  phone: string;
  role: string;
  status: "active" | "standby" | "field_dispatched";
}

