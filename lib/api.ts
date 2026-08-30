import {
  ResponseTeamRequest,
  CitizenResponse,
  PredeterminedPermissionSettings,
  RadicalRegionRule,
  RescuerUnitProfile,
  HeadResourceEstimation,
} from "@/types/rescuer";

export type {
  ResponseTeamRequest,
  CitizenResponse,
  PredeterminedPermissionSettings,
  RadicalRegionRule,
  HeadResourceEstimation,
} from "@/types/rescuer";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL !== undefined ? process.env.NEXT_PUBLIC_API_URL : "";
const AUTH_TOKEN = "demo-authority-token";

export interface ReportItem {
  id: string;
  session_id: string;
  type: string;
  description?: string;
  photo_url?: string;
  status: "unverified" | "verified" | "in_progress" | "resolved" | "denied_auto_routed";
  created_at: string;
  lat?: number;
  lng?: number;
  location_wkt?: string;
  cluster_count?: number;
  assigned_rescuer_id?: string;
  assigned_rescuer?: RescuerUnitProfile;
  rescuer_status?: "pending_admin" | "assigned" | "admin_denied_auto_routed" | "arrived";
  address?: string;
  denied_by_admin?: boolean;
  assignment_source?: "admin_dispatch" | "nearest_fallback_admin_denied";
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
const FALLBACK_RESOURCES: ResourceItem[] = [];

let inMemoryIncidents: ReportItem[] = [];

// In-memory state for Response Team Requests
let inMemoryTeamRequests: ResponseTeamRequest[] = [];

// In-memory state for Citizen Responses
let inMemoryCitizenResponses: CitizenResponse[] = [];

// In-memory Predetermined Permission Settings for Radical Regions
let inMemoryPermissionSettings: PredeterminedPermissionSettings = {
  globalAutoDispatchEnabled: true,
  radicalRegionsAutoAlertEnabled: true,
  minReportClusterForAutoDispatch: 2,
  maxAutoDispatchRadiusKm: 5,
  requireAdminPostConfirmation: true,
  regions: [],
};

// In-memory state for Live Rescuer / Resource Giver GPS Locations
const inMemoryRescuerLocations: RescuerUnitProfile[] = [];

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
    reportId: resp.reportId || "REP-" + Date.now().toString(36),
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

// ── Location & Reverse Geocoding ──

export async function apiReverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (err) {
    console.warn("Reverse geocode fetch error:", err);
  }
  return `Sector (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

export function calcDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
    const data = await res.json();
    if (data.report) {
      inMemoryIncidents.unshift(data.report);
    }
    return data;
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
      location_wkt: `POINT(${(formData.get("lng") as string) || "72.8777"} ${(formData.get("lat") as string) || "19.076"})`,
      address: (formData.get("description") as string)?.split("]")[0]?.replace("[", "") || "Current Location",
      rescuer_status: "pending_admin",
    };
    inMemoryIncidents.unshift(newRep);
    return { report: newRep };
  }
}

export async function apiGetCitizenReports(sessionId: string): Promise<ReportItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/reports?session_id=${encodeURIComponent(sessionId)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return inMemoryIncidents.filter((i) => i.session_id === sessionId);
}

export async function apiGetActiveReportForSession(sessionId: string): Promise<ReportItem | null> {
  const reports = await apiGetCitizenReports(sessionId);
  const active = reports.find((r) => r.status !== "resolved");
  return active || null;
}

export async function apiGetIncidentById(incidentId: string): Promise<ReportItem | null> {
  const inc = inMemoryIncidents.find((i) => i.id === incidentId);
  return inc || null;
}

// ── Authority / Incidents Endpoints ──

export async function apiGetAllIncidents(): Promise<ReportItem[]> {
  let serverIncidents: ReportItem[] = [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/incidents`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        serverIncidents = data;
      }
    }
  } catch {
    // fallback
  }

  const combinedMap = new Map<string, ReportItem>();
  inMemoryIncidents.forEach((inc) => combinedMap.set(inc.id, inc));
  serverIncidents.forEach((inc) => {
    if (!combinedMap.has(inc.id)) {
      combinedMap.set(inc.id, inc);
    }
  });

  return Array.from(combinedMap.values());
}

export async function apiGetAllResources(): Promise<ResourceItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/resources`, {
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return FALLBACK_RESOURCES;
}

export async function apiGetShortlist(incidentId: string): Promise<ResourceItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/shortlist`, {
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return FALLBACK_RESOURCES.slice(0, 3);
}

export async function apiConfirmAllocation(reportId: string, resourceId: string): Promise<{
  allocation: AllocationItem;
  report: ReportItem;
  resource: ResourceItem;
}> {
  // Find matching rescuer unit profile
  let rescuerUnit = inMemoryRescuerLocations.find((r) => r.id === resourceId);
  if (!rescuerUnit) {
    const fallbackRes = FALLBACK_RESOURCES.find((r) => r.id === resourceId);
    rescuerUnit = {
      id: resourceId,
      name: fallbackRes?.name || "Emergency Rescue Team",
      callsign: "RESCUE-01",
      type: fallbackRes?.type || "rescue_team",
      leaderName: "Officer S. Kumar",
      phone: "+91 98765 00000",
      status: "en_route",
      lat: (fallbackRes?.lat || 19.32) - 0.01,
      lng: (fallbackRes?.lng || 84.80) - 0.01,
      assignedReportId: reportId,
      assignmentSource: "admin_dispatch",
      supplies: { foodRationKits: 10, foodRationCapacity: 20, waterLiters: 50, waterCapacityLiters: 100, medicalKits: 5, medicalKitsCapacity: 10, ivFluidsCount: 5, shelterBedsAvailable: 0, shelterBedsTotal: 0, lifeJackets: 10, fuelLiters: 40, satPhoneBatteryPct: 85 }
    };
    inMemoryRescuerLocations.push(rescuerUnit);
  } else {
    rescuerUnit.status = "en_route";
    rescuerUnit.assignedReportId = reportId;
    rescuerUnit.assignmentSource = "admin_dispatch";
  }

  // Update in-memory incident
  inMemoryIncidents = inMemoryIncidents.map((inc) => {
    if (inc.id === reportId) {
      return {
        ...inc,
        status: "in_progress",
        assigned_rescuer_id: resourceId,
        assigned_rescuer: rescuerUnit,
        rescuer_status: "assigned",
        assignment_source: "admin_dispatch",
        denied_by_admin: false,
      };
    }
    return inc;
  });

  const updatedIncident = inMemoryIncidents.find((i) => i.id === reportId)!;

  try {
    const res = await fetch(`${API_BASE_URL}/api/allocations/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-authority-token": AUTH_TOKEN,
      },
      body: JSON.stringify({ report_id: reportId, resource_id: resourceId }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback to in-memory return
  }

  const confirmedAllocation: AllocationItem = {
    id: "alloc-" + Math.floor(Math.random() * 1000),
    report_id: reportId,
    resource_id: resourceId,
    status: "en_route",
    recommended_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
  };

  const allocatedResource: ResourceItem = {
    id: resourceId,
    name: rescuerUnit.name,
    type: rescuerUnit.type,
    capacity_total: 10,
    capacity_used: 1,
    status: "en_route",
    disaster_types: ["flood", "medical"],
  };

  return {
    allocation: confirmedAllocation,
    report: updatedIncident,
    resource: allocatedResource,
  };
}

// ── Admin Deny Request & Auto-Route to Nearest Rescuer ──

export async function apiDenyIncidentAndAutoRoute(incidentId: string): Promise<{
  report: ReportItem;
  rescuer: RescuerUnitProfile;
}> {
  const incident = inMemoryIncidents.find((i) => i.id === incidentId);
  const incLat = incident?.lat || 19.076;
  const incLng = incident?.lng || 72.8777;

  // Calculate distances to all rescuers and find nearest
  let nearestRescuer: RescuerUnitProfile | null = null;
  let minDistance = Infinity;

  inMemoryRescuerLocations.forEach((r) => {
    const dist = calcDistanceKm(incLat, incLng, r.lat, r.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestRescuer = r;
    }
  });

  if (!nearestRescuer) {
    nearestRescuer = {
      id: "res-field-" + Math.random().toString(36).substring(2, 7),
      name: "Rapid Field Response Unit",
      callsign: "RESCUE-RAPID-01",
      type: "rescue_team",
      leaderName: "Cmdr. Rajesh Verma",
      phone: "+91 98765 11001",
      status: "en_route",
      lat: incLat + 0.012,
      lng: incLng + 0.012,
      assignedReportId: incidentId,
      assignmentSource: "nearest_fallback",
      supplies: { foodRationKits: 20, foodRationCapacity: 40, waterLiters: 100, waterCapacityLiters: 200, medicalKits: 10, medicalKitsCapacity: 20, ivFluidsCount: 15, shelterBedsAvailable: 0, shelterBedsTotal: 0, lifeJackets: 20, fuelLiters: 60, satPhoneBatteryPct: 90 }
    };
    inMemoryRescuerLocations.push(nearestRescuer);
  }

  // Update rescuer unit status
  nearestRescuer = {
    ...nearestRescuer,
    status: "en_route",
    assignedReportId: incidentId,
    assignmentSource: "nearest_fallback",
  };

  // Update in-memory rescuer location list
  const idx = inMemoryRescuerLocations.findIndex((r) => r.id === nearestRescuer!.id);
  if (idx !== -1) {
    inMemoryRescuerLocations[idx] = nearestRescuer;
  }

  // Update in-memory incident
  inMemoryIncidents = inMemoryIncidents.map((inc) => {
    if (inc.id === incidentId) {
      return {
        ...inc,
        status: "in_progress",
        denied_by_admin: true,
        rescuer_status: "admin_denied_auto_routed",
        assigned_rescuer_id: nearestRescuer!.id,
        assigned_rescuer: nearestRescuer!,
        assignment_source: "nearest_fallback_admin_denied",
      };
    }
    return inc;
  });

  const updatedIncident = inMemoryIncidents.find((i) => i.id === incidentId)!;

  return {
    report: updatedIncident,
    rescuer: nearestRescuer,
  };
}

// ── Live Map Polling Simulation for Assigned Rescuer Arrival ──

export async function apiPollRescuerMovement(incidentId: string): Promise<ReportItem | null> {
  const incidentIndex = inMemoryIncidents.findIndex((i) => i.id === incidentId);
  if (incidentIndex === -1) return null;

  const incident = inMemoryIncidents[incidentIndex];
  if (!incident.assigned_rescuer || incident.status === "resolved") {
    return incident;
  }

  const rescuer = incident.assigned_rescuer;
  const targetLat = incident.lat || 19.076;
  const targetLng = incident.lng || 72.8777;

  const dLat = targetLat - rescuer.lat;
  const dLng = targetLng - rescuer.lng;
  const distKm = calcDistanceKm(rescuer.lat, rescuer.lng, targetLat, targetLng);

  if (distKm < 0.05) { // Less than 50 meters
    const arrivedRescuer: RescuerUnitProfile = {
      ...rescuer,
      lat: targetLat,
      lng: targetLng,
      status: "at_scene",
    };
    inMemoryIncidents[incidentIndex] = {
      ...incident,
      assigned_rescuer: arrivedRescuer,
      rescuer_status: "arrived",
    };
  } else {
    // Move rescuer 15% closer to target each poll cycle
    const nextLat = rescuer.lat + dLat * 0.15;
    const nextLng = rescuer.lng + dLng * 0.15;

    const movingRescuer: RescuerUnitProfile = {
      ...rescuer,
      lat: nextLat,
      lng: nextLng,
      status: "en_route",
    };

    // Update in-memory rescuer location list
    const rIdx = inMemoryRescuerLocations.findIndex((r) => r.id === rescuer.id);
    if (rIdx !== -1) {
      inMemoryRescuerLocations[rIdx] = movingRescuer;
    }

    inMemoryIncidents[incidentIndex] = {
      ...incident,
      assigned_rescuer: movingRescuer,
    };
  }

  return inMemoryIncidents[incidentIndex];
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
  inMemoryIncidents = inMemoryIncidents.map((inc) => (inc.id === incidentId ? { ...inc, status: "resolved" } : inc));
  const updatedIncident = inMemoryIncidents.find((i) => i.id === incidentId)!;

  try {
    const res = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/resolve`, {
      method: "POST",
      headers: {
        "x-authority-token": AUTH_TOKEN,
      },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  return { report: updatedIncident };
}

// ── Rescue Team Head Resource Estimations ──

let inMemoryHeadEstimations: HeadResourceEstimation[] = [];

export async function apiSaveHeadResourceEstimation(
  estimation: Partial<HeadResourceEstimation>
): Promise<HeadResourceEstimation> {
  const newEst: HeadResourceEstimation = {
    id: "EST-" + Math.floor(100 + Math.random() * 900),
    incidentId: estimation.incidentId || "INC-101",
    unitId: estimation.unitId || "demo-team-alpha",
    leaderName: estimation.leaderName || "Rescue Commander",
    locationName: estimation.locationName || "Target Area",
    areaRadiusKm: estimation.areaRadiusKm || 2.5,
    totalRequestsCount: estimation.totalRequestsCount || 1,
    totalPeopleCount: estimation.totalPeopleCount || 4,
    estimatedFoodKits: estimation.estimatedFoodKits || 20,
    estimatedWaterLiters: estimation.estimatedWaterLiters || 100,
    estimatedMedicalKits: estimation.estimatedMedicalKits || 5,
    estimatedLifeJackets: estimation.estimatedLifeJackets || 10,
    estimatedFuelLiters: estimation.estimatedFuelLiters || 40,
    specialEquipment: estimation.specialEquipment || "Searchlights & Hydraulic Cutters",
    setAt: new Date().toISOString(),
    status: "confirmed_broadcast",
  };

  inMemoryHeadEstimations = inMemoryHeadEstimations.filter(
    (e) => e.incidentId !== newEst.incidentId || e.unitId !== newEst.unitId
  );
  inMemoryHeadEstimations.unshift(newEst);

  return newEst;
}

export async function apiGetHeadResourceEstimation(
  incidentId: string,
  unitId?: string
): Promise<HeadResourceEstimation | null> {
  const est = inMemoryHeadEstimations.find(
    (e) => e.incidentId === incidentId && (!unitId || e.unitId === unitId)
  );
  return est || null;
}

// ── Office-Based Regional Incident Filtering ──

export async function apiGetIncidentsForOfficeRegion(
  officeLat: number,
  officeLng: number,
  radiusKm: number = 25
): Promise<ReportItem[]> {
  const all = await apiGetAllIncidents();
  if (!officeLat || !officeLng) return all;

  return all.filter((inc) => {
    const incLat = inc.lat || 19.076;
    const incLng = inc.lng || 72.8777;
    const dist = calcDistanceKm(officeLat, officeLng, incLat, incLng);
    return dist <= radiusKm;
  });
}



