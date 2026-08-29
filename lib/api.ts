import {
  ResponseTeamRequest,
  CitizenResponse,
  PredeterminedPermissionSettings,
  RadicalRegionRule,
  RescuerUnitProfile
} from "@/types/rescuer";

export type {
  ResponseTeamRequest,
  CitizenResponse,
  PredeterminedPermissionSettings,
  RadicalRegionRule,
} from "@/types/rescuer";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL !== undefined ? process.env.NEXT_PUBLIC_API_URL : "";
const AUTH_TOKEN = "demo-authority-token";

export interface ReportItem {
  id: string;
  session_id: string;
  type: string;
  description?: string;
  photo_url?: string;
  status: "unverified" | "verified" | "in_progress" | "resolved";
  created_at: string;
  lat?: number;
  lng?: number;
  location_wkt?: string;
  cluster_count?: number;
}

export interface ResourceItem {
  id: string;
  name: string;
  type: string;
  capacity_total: number;
  capacity_used: number;
  status: "available" | "en_route" | "at_scene";
  disaster_types: string[];
  distance_meters?: number;
  lat?: number;
  lng?: number;
  location_wkt?: string;
}

export interface AllocationItem {
  id: string;
  report_id: string;
  resource_id: string;
  status: "recommended" | "confirmed" | "en_route" | "at_scene" | "resolved";
  recommended_at: string;
  confirmed_at?: string;
}

// Fallback seed resources in case backend is offline
const FALLBACK_RESOURCES: ResourceItem[] = [
  { id: "res-1", name: "Brahmapur NDRF Boat Unit", type: "boat", capacity_total: 12, capacity_used: 0, status: "available", disaster_types: ["flood", "cyclone"], lat: 19.315, lng: 84.794 },
  { id: "res-2", name: "City Hospital Rapid Ambulance", type: "ambulance", capacity_total: 4, capacity_used: 1, status: "available", disaster_types: ["medical", "flood", "fire"], lat: 19.320, lng: 84.800 },
  { id: "res-3", name: "District Relief Shelter #4", type: "shelter", capacity_total: 300, capacity_used: 120, status: "available", disaster_types: ["flood", "cyclone", "landslide"], lat: 19.308, lng: 84.788 },
  { id: "res-4", name: "Coastal Rescue Fire Engine", type: "fire_engine", capacity_total: 6, capacity_used: 0, status: "available", disaster_types: ["fire", "flood"], lat: 19.325, lng: 84.790 },
];

const FALLBACK_INCIDENTS: ReportItem[] = [
  { id: "INC-101", session_id: "demo-s1", type: "flood", description: "Water level rising rapidly near main market bridge", status: "verified", created_at: new Date().toISOString(), lat: 19.076, lng: 72.8777, location_wkt: "POINT(72.8777 19.0760)" },
  { id: "INC-102", session_id: "demo-s2", type: "cyclone", description: "Trees fallen and power lines disrupted", status: "unverified", created_at: new Date().toISOString(), lat: 19.085, lng: 72.885, location_wkt: "POINT(72.885 19.085)" },
];

// In-memory state for Response Team Requests
let inMemoryTeamRequests: ResponseTeamRequest[] = [
  {
    id: "REQ-901",
    unitId: "res-1",
    unitName: "Brahmapur NDRF Boat Unit",
    callsign: "Alpha-1",
    requestType: "supplies",
    title: "Urgent: 50L Clean Water & Medical Kits Needed",
    details: "Evacuated 18 citizens near Market Bridge; drinking water and pediatric ORS kits exhausted.",
    urgency: "critical",
    status: "pending",
    requestedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    lat: 19.315,
    lng: 84.794,
    locationName: "Brahmapur Market Sector 4",
  },
  {
    id: "REQ-902",
    unitId: "res-4",
    unitName: "Coastal Rescue Fire Engine",
    callsign: "Fire-Command-2",
    requestType: "equipment",
    title: "High-Capacity Hydraulic Cutter & Searchlights",
    details: "Building structural collapse at Station Road requires hydraulic cutters for trapped victims.",
    urgency: "high",
    status: "pending",
    requestedAt: new Date(Date.now() - 40 * 60000).toISOString(),
    lat: 19.325,
    lng: 84.790,
    locationName: "Station Road Junction",
  },
  {
    id: "REQ-903",
    unitId: "res-2",
    unitName: "City Hospital Rapid Ambulance",
    callsign: "Medic-Alpha",
    requestType: "reinforcement",
    title: "Request Additional Triage Rescuers (2 Medics)",
    details: "Over 12 injured citizens requiring immediate stabilization before transport.",
    urgency: "critical",
    status: "approved",
    requestedAt: new Date(Date.now() - 60 * 60000).toISOString(),
    lat: 19.320,
    lng: 84.800,
    locationName: "East Relief Camp Hub",
  },
];

// In-memory state for Citizen Responses
let inMemoryCitizenResponses: CitizenResponse[] = [
  {
    id: "CIT-801",
    reportId: "INC-101",
    citizenName: "Ramesh Senapati",
    phone: "+91 98765 43210",
    status: "trapped",
    message: "4 members stranded on roof of 2-storey house. Water level reached 1st floor ceiling. Need boat!",
    peopleCount: 4,
    timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
    lat: 19.078,
    lng: 72.879,
    locationName: "Low-Lying River Delta (Radical Zone Alpha)",
    isRadicalRegion: true,
    autoAlertTriggered: true,
  },
  {
    id: "CIT-802",
    reportId: "INC-102",
    citizenName: "Priyanka Naik",
    phone: "+91 91234 56789",
    status: "medical_need",
    message: "Elderly person suffering severe dyspnea and fever. Oxygen cylinder running low.",
    peopleCount: 2,
    timestamp: new Date(Date.now() - 22 * 60000).toISOString(),
    lat: 19.088,
    lng: 72.887,
    locationName: "Coastal Storm Surge Slope (Radical Zone Gamma)",
    isRadicalRegion: true,
    autoAlertTriggered: true,
  },
  {
    id: "CIT-803",
    reportId: "INC-101",
    citizenName: "Anil Mohanty",
    phone: "+91 99887 76655",
    status: "safe",
    message: "Moved safely to Higher Ground School Camp. Food rations received.",
    peopleCount: 5,
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    lat: 19.072,
    lng: 72.871,
    locationName: "West Ridge Relief Shelter",
    isRadicalRegion: false,
    autoAlertTriggered: false,
  },
];

// In-memory Predetermined Permission Settings for Radical Regions
let inMemoryPermissionSettings: PredeterminedPermissionSettings = {
  globalAutoDispatchEnabled: true,
  radicalRegionsAutoAlertEnabled: true,
  minReportClusterForAutoDispatch: 2,
  maxAutoDispatchRadiusKm: 5,
  requireAdminPostConfirmation: true,
  regions: [
    {
      id: "RAD-ZONE-1",
      regionName: "Low-Lying River Delta (Zone Alpha)",
      riskLevel: "extreme_radical",
      centerLat: 19.078,
      centerLng: 72.879,
      radiusKm: 3.5,
      autoBroadcastSosToRescuers: true,
      autoDispatchThreshold: 1,
      rescuerAuthorityLevel: "level_1_autonomous",
      enabled: true,
      activeAlertsCount: 3,
    },
    {
      id: "RAD-ZONE-2",
      regionName: "Coastal Storm Surge Slope (Zone Gamma)",
      riskLevel: "high_risk",
      centerLat: 19.088,
      centerLng: 72.887,
      radiusKm: 4.0,
      autoBroadcastSosToRescuers: true,
      autoDispatchThreshold: 2,
      rescuerAuthorityLevel: "level_2_field_resource",
      enabled: true,
      activeAlertsCount: 2,
    },
    {
      id: "RAD-ZONE-3",
      regionName: "Landslide Flash Flood Ravine (Zone Delta)",
      riskLevel: "extreme_radical",
      centerLat: 19.315,
      centerLng: 84.794,
      radiusKm: 5.0,
      autoBroadcastSosToRescuers: true,
      autoDispatchThreshold: 1,
      rescuerAuthorityLevel: "level_1_autonomous",
      enabled: true,
      activeAlertsCount: 1,
    },
  ],
};

// In-memory state for Live Rescuer / Resource Giver GPS Locations
const inMemoryRescuerLocations: RescuerUnitProfile[] = [
  {
    id: "res-1", name: "Brahmapur NDRF Boat Unit", callsign: "BOAT-DELTA-03", type: "boat",
    leaderName: "Insp. S. Mohanty", phone: "+91 90000 11111", status: "at_scene",
    lat: 19.316, lng: 84.793, assignedReportId: "INC-101", assignmentSource: "admin_dispatch",
    supplies: {
      foodRationKits: 12, foodRationCapacity: 30, waterLiters: 40, waterCapacityLiters: 200,
      medicalKits: 3, medicalKitsCapacity: 10, ivFluidsCount: 6, shelterBedsAvailable: 0,
      shelterBedsTotal: 0, lifeJackets: 14, fuelLiters: 55, satPhoneBatteryPct: 72,
    },
  },
  {
    id: "res-2", name: "City Hospital Rapid Ambulance", callsign: "MED-UNIT-102", type: "ambulance",
    leaderName: "Dr. A. Rao", phone: "+91 90000 22222", status: "en_route",
    lat: 19.321, lng: 84.799, assignedReportId: "INC-102", assignmentSource: "nearest_fallback",
    supplies: {
      foodRationKits: 0, foodRationCapacity: 0, waterLiters: 10, waterCapacityLiters: 20,
      medicalKits: 8, medicalKitsCapacity: 12, ivFluidsCount: 20, shelterBedsAvailable: 0,
      shelterBedsTotal: 0, lifeJackets: 2, fuelLiters: 38, satPhoneBatteryPct: 90,
    },
  },
  {
    id: "res-3", name: "Rescue Team Alpha", callsign: "RESCUE-ALPHA-01", type: "rescue_team",
    leaderName: "Cmdr. V. Singh", phone: "+91 90000 33333", status: "available",
    lat: 19.309, lng: 84.802, assignedReportId: null, assignmentSource: null,
    supplies: {
      foodRationKits: 20, foodRationCapacity: 40, waterLiters: 120, waterCapacityLiters: 300,
      medicalKits: 6, medicalKitsCapacity: 15, ivFluidsCount: 10, shelterBedsAvailable: 0,
      shelterBedsTotal: 0, lifeJackets: 25, fuelLiters: 80, satPhoneBatteryPct: 64,
    },
  },
  {
    id: "res-4", name: "Coastal Relief Shelter Hub", callsign: "SHELTER-HUB-01", type: "shelter",
    leaderName: "Ms. R. Behera", phone: "+91 90000 44444", status: "at_scene",
    lat: 19.327, lng: 84.788, assignedReportId: null, assignmentSource: null,
    supplies: {
      foodRationKits: 60, foodRationCapacity: 120, waterLiters: 500, waterCapacityLiters: 1000,
      medicalKits: 10, medicalKitsCapacity: 25, ivFluidsCount: 15, shelterBedsAvailable: 45,
      shelterBedsTotal: 80, lifeJackets: 5, fuelLiters: 20, satPhoneBatteryPct: 100,
    },
  },
];

export async function apiGetRescuerLocations(): Promise<RescuerUnitProfile[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/rescuer-locations`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return inMemoryRescuerLocations;
}

// ── Response Team Requests Endpoints ──

export async function apiGetResponseTeamRequests(): Promise<ResponseTeamRequest[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/rescuer-requests`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return inMemoryTeamRequests;
}

export async function apiUpdateTeamRequestStatus(
  requestId: string,
  status: "approved" | "dispatched" | "fulfilled"
): Promise<ResponseTeamRequest> {
  inMemoryTeamRequests = inMemoryTeamRequests.map((req) =>
    req.id === requestId ? { ...req, status } : req
  );
  const updated = inMemoryTeamRequests.find((r) => r.id === requestId);
  if (!updated) throw new Error("Request not found");
  return updated;
}

export async function apiCreateTeamRequest(newReq: Partial<ResponseTeamRequest>): Promise<ResponseTeamRequest> {
  const reqItem: ResponseTeamRequest = {
    id: "REQ-" + Math.floor(100 + Math.random() * 900),
    unitId: newReq.unitId || "res-1",
    unitName: newReq.unitName || "Field Rescue Unit",
    callsign: newReq.callsign || "Unit-1",
    requestType: newReq.requestType || "supplies",
    title: newReq.title || "Emergency Field Assistance",
    details: newReq.details || "",
    urgency: newReq.urgency || "high",
    status: "pending",
    requestedAt: new Date().toISOString(),
    lat: newReq.lat || 19.076,
    lng: newReq.lng || 72.8777,
    locationName: newReq.locationName || "Field Sector",
  };
  inMemoryTeamRequests.unshift(reqItem);
  return reqItem;
}

// ── Citizen Responses Endpoints ──

export async function apiGetCitizenResponses(): Promise<CitizenResponse[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/citizen-responses`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return inMemoryCitizenResponses;
}

export async function apiSubmitCitizenResponse(resp: Partial<CitizenResponse>): Promise<CitizenResponse> {
  const item: CitizenResponse = {
    id: "CIT-" + Math.floor(100 + Math.random() * 900),
    reportId: resp.reportId || "INC-101",
    citizenName: resp.citizenName || "Citizen User",
    phone: resp.phone || "+91 90000 00000",
    status: resp.status || "immediate_help",
    message: resp.message || "Emergency response submitted",
    peopleCount: resp.peopleCount || 1,
    timestamp: new Date().toISOString(),
    lat: resp.lat || 19.076,
    lng: resp.lng || 72.8777,
    locationName: resp.locationName || "Target Location",
    isRadicalRegion: resp.isRadicalRegion || true,
    autoAlertTriggered: resp.autoAlertTriggered || true,
  };
  inMemoryCitizenResponses.unshift(item);
  return item;
}

// ── Automated Alert Permissions & Radical Regions Endpoints ──

export async function apiGetAutomatedPermissions(): Promise<PredeterminedPermissionSettings> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/permissions`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return inMemoryPermissionSettings;
}

export async function apiUpdateAutomatedPermissions(
  updatedSettings: Partial<PredeterminedPermissionSettings>
): Promise<PredeterminedPermissionSettings> {
  inMemoryPermissionSettings = {
    ...inMemoryPermissionSettings,
    ...updatedSettings,
  };
  return inMemoryPermissionSettings;
}

export async function apiToggleRadicalRegionRule(
  regionId: string,
  enabled: boolean
): Promise<RadicalRegionRule> {
  inMemoryPermissionSettings.regions = inMemoryPermissionSettings.regions.map((r) =>
    r.id === regionId ? { ...r, enabled } : r
  );
  const updated = inMemoryPermissionSettings.regions.find((r) => r.id === regionId);
  if (!updated) throw new Error("Region not found");
  return updated;
}

// ── Original Citizen Endpoints ──

export async function apiSubmitReport(formData: FormData): Promise<{ report: ReportItem; verifiedReports?: ReportItem[] }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/reports`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || "Failed to submit emergency report");
    }
    return await res.json();
  } catch (err) {
    console.warn("Backend API not reachable for submitReport, creating local report:", err);
    const newRep: ReportItem = {
      id: "REP-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      session_id: (formData.get("session_id") as string) || "local-session",
      type: (formData.get("type") as string) || "flood",
      description: (formData.get("description") as string) || "",
      status: "unverified",
      created_at: new Date().toISOString(),
      lat: parseFloat((formData.get("lat") as string) || "19.076"),
      lng: parseFloat((formData.get("lng") as string) || "72.8777"),
    };
    return { report: newRep };
  }
}

export async function apiGetCitizenReports(sessionId: string): Promise<ReportItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/reports?session_id=${encodeURIComponent(sessionId)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return FALLBACK_INCIDENTS;
    }
    return await res.json();
  } catch {
    return FALLBACK_INCIDENTS;
  }
}

// ── Authority / Incidents Endpoints ──

export async function apiGetAllIncidents(): Promise<ReportItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/incidents`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return FALLBACK_INCIDENTS;
    }
    return await res.json();
  } catch {
    return FALLBACK_INCIDENTS;
  }
}

export async function apiGetAllResources(): Promise<ResourceItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/resources`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return FALLBACK_RESOURCES;
    }
    return await res.json();
  } catch {
    return FALLBACK_RESOURCES;
  }
}

export async function apiGetShortlist(incidentId: string): Promise<ResourceItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/shortlist`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return FALLBACK_RESOURCES.slice(0, 3);
    }
    return await res.json();
  } catch {
    return FALLBACK_RESOURCES.slice(0, 3);
  }
}

export async function apiConfirmAllocation(reportId: string, resourceId: string): Promise<{
  allocation: AllocationItem;
  report: ReportItem;
  resource: ResourceItem;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/allocations/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-authority-token": AUTH_TOKEN,
      },
      body: JSON.stringify({ report_id: reportId, resource_id: resourceId }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to confirm allocation");
    }
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
    throw new Error(msg);
  }
}

export async function apiUpdateResourceStatus(resourceId: string, status: "en_route" | "at_scene" | "available"): Promise<ResourceItem> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/resources/${resourceId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-authority-token": AUTH_TOKEN,
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to update resource status");
    }
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
    throw new Error(msg);
  }
}

export async function apiResolveIncident(incidentId: string): Promise<{
  report: ReportItem;
  allocation?: AllocationItem;
  resource?: ResourceItem;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/resolve`, {
      method: "POST",
      headers: {
        "x-authority-token": AUTH_TOKEN,
      },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to resolve incident");
    }
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
    throw new Error(msg);
  }
}

