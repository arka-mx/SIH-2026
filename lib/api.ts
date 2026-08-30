import {
  ResponseTeamRequest,
  CitizenResponse,
  PredeterminedPermissionSettings,
  RadicalRegionRule,
  RescuerUnitProfile,
  HeadResourceEstimation,
  DistrictHeadDirective,
  ResourceRequirementItem,
  MemberOrderAllocation,
  TeamMember,
} from "@/types/rescuer";

export type {
  ResponseTeamRequest,
  CitizenResponse,
  PredeterminedPermissionSettings,
  RadicalRegionRule,
  HeadResourceEstimation,
  DistrictHeadDirective,
  ResourceRequirementItem,
  MemberOrderAllocation,
  TeamMember,
} from "@/types/rescuer";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL !== undefined ? process.env.NEXT_PUBLIC_API_URL : "";
const AUTH_TOKEN = "demo-authority-token";

export interface ReportItem {
  id: string;
  session_id: string;
  device_id?: string;
  type: string;
  description?: string;
  photo_url?: string;
  status: "unverified" | "verified" | "in_progress" | "resolved" | "denied_auto_routed" | "cancelled";
  created_at: string;
  updated_at?: string;
  lat?: number;
  lng?: number;
  location_wkt?: string;
  cluster_count?: number;
  assigned_rescuer_id?: string;
  assigned_rescuer?: RescuerUnitProfile;
  rescuer_status?: "pending_admin" | "assigned" | "admin_denied_auto_routed" | "arrived";
  address?: string;
  region?: string;
  denied_by_admin?: boolean;
  assignment_source?: "admin_dispatch" | "nearest_fallback_admin_denied";
  reports?: any[];
  report_count?: number;
  action?: "CREATED" | "UPDATED" | "IDEMPOTENT_DUPLICATE";
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
let FALLBACK_RESOURCES: ResourceItem[] = [
  {
    id: "res-food-central",
    name: "District Central Food Ration Stock",
    type: "food_stock",
    capacity_total: 1000,
    capacity_used: 180,
    status: "available",
    disaster_types: ["flood", "cyclone", "fire", "landslide"],
    lat: 19.318,
    lng: 84.795,
    location_wkt: "POINT(84.795 19.318)",
  },
  {
    id: "res-water-reserve",
    name: "Regional Potable Drinking Water Depot",
    type: "food_stock",
    capacity_total: 4500,
    capacity_used: 850,
    status: "available",
    disaster_types: ["flood", "cyclone", "fire", "medical"],
    lat: 19.312,
    lng: 84.791,
    location_wkt: "POINT(84.791 19.312)",
  },
  {
    id: "res-med-depot",
    name: "District Hospital Emergency Medical Packs",
    type: "medical_van",
    capacity_total: 300,
    capacity_used: 42,
    status: "available",
    disaster_types: ["medical", "flood", "cyclone", "fire"],
    lat: 19.325,
    lng: 84.802,
    location_wkt: "POINT(84.802 19.325)",
  },
  {
    id: "res-gear-vests",
    name: "Civil Defense Life Jackets & Inflatable Boats Hub",
    type: "boat",
    capacity_total: 250,
    capacity_used: 55,
    status: "available",
    disaster_types: ["flood", "cyclone"],
    lat: 19.308,
    lng: 84.788,
    location_wkt: "POINT(84.788 19.308)",
  },
  {
    id: "res-shelter-main",
    name: "Government Community Disaster Shelter Camp",
    type: "shelter",
    capacity_total: 600,
    capacity_used: 190,
    status: "available",
    disaster_types: ["flood", "cyclone", "fire"],
    lat: 19.330,
    lng: 84.810,
    location_wkt: "POINT(84.810 19.330)",
  },
  {
    id: "res-fuel-depot",
    name: "Emergency Operations Diesel & Fuel Stock",
    type: "rescue_team",
    capacity_total: 1500,
    capacity_used: 320,
    status: "available",
    disaster_types: ["flood", "cyclone", "fire"],
    lat: 19.305,
    lng: 84.780,
    location_wkt: "POINT(84.780 19.305)",
  },
];

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
    channel: resp.channel || "web",
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

export interface GeocodeLocation {
  displayName: string;
  region: string;
  city?: string;
  district?: string;
  state?: string;
}

export async function apiReverseGeocode(lat: number, lng: number): Promise<string> {
  const result = await apiReverseGeocodeDetailed(lat, lng);
  return result.displayName;
}

export async function apiReverseGeocodeDetailed(lat: number, lng: number): Promise<GeocodeLocation> {
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
      if (data && data.address) {
        const city = data.address.city || data.address.town || data.address.village || data.address.suburb || "Coastal Sector";
        const district = data.address.state_district || data.address.county || data.address.district || city;
        const state = data.address.state || "State Jurisdiction";
        const region = `${city}, ${district}`;

        return {
          displayName: data.display_name || `${region}, ${state}`,
          region,
          city,
          district,
          state,
        };
      }
    }
  } catch (err) {
    console.warn("Reverse geocode fetch error:", err);
  }
  return {
    displayName: `Sector Region (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    region: `Region (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
  };
}

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

/** Forward geocode a free-text place name (e.g. "Brahmapur, Odisha"). */
export async function apiForwardGeocode(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`,
      { headers: { "Accept-Language": "en-US,en;q=0.9" } }
    );
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        return data
          .filter((d) => d && d.display_name && d.lat && d.lon)
          .map((d) => ({
            label: d.display_name as string,
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon),
          }));
      }
    }
  } catch (err) {
    console.warn("Forward geocode fetch error:", err);
  }
  return [];
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

// ── Safe Check-In Sharing ──

import { buildSafeSnapshot, ReportLike, SafeStatusView } from "@/lib/safeShare";
export { buildSafeSnapshot } from "@/lib/safeShare";
export type { SafeStatusView } from "@/lib/safeShare";

/**
 * Publish a public "I'm safe" snapshot so a shared /safe/<id> link resolves even
 * when the rescue backend or DB is offline. Best-effort: a failure here should
 * not block the citizen from sharing the link.
 */
export async function apiPublishSafeShare(report: ReportLike): Promise<SafeStatusView> {
  const snapshot = buildSafeSnapshot(report);
  try {
    await fetch(`${API_BASE_URL}/api/safe/${encodeURIComponent(snapshot.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    });
  } catch (err) {
    console.warn("apiPublishSafeShare: could not reach server, link may be local-only:", err);
  }
  return snapshot;
}

// ── Original Citizen Endpoints ──

export async function apiSubmitReport(formData: FormData): Promise<{ report: ReportItem; verifiedReports?: ReportItem[]; action?: string }> {
  try {
    const deviceId = (formData.get("device_id") as string) || (formData.get("session_id") as string) || "dev-anonymous-client";
    const idempotencyKey = (formData.get("idempotency_key") as string) || "";

    const res = await fetch(`${API_BASE_URL}/api/rescue/request`, {
      method: "POST",
      headers: {
        "x-device-id": deviceId,
        ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || "Failed to submit emergency rescue request");
    }
    const data = await res.json();
    if (data.report) {
      inMemoryIncidents = inMemoryIncidents.filter((i) => i.id !== data.report.id);
      inMemoryIncidents.unshift(data.report);
    }
    return data;
  } catch (err) {
    console.warn("Backend API not reachable for submitReport, creating local report:", err);
    const deviceId = (formData.get("device_id") as string) || (formData.get("session_id") as string) || "dev-local-session";
    const newRep: ReportItem = {
      id: "REP-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      session_id: deviceId,
      device_id: deviceId,
      type: (formData.get("type") as string) || "flood",
      description: (formData.get("description") as string) || "",
      status: "unverified",
      created_at: new Date().toISOString(),
      lat: parseFloat((formData.get("lat") as string) || "19.076"),
      lng: parseFloat((formData.get("lng") as string) || "72.8777"),
      location_wkt: `POINT(${(formData.get("lng") as string) || "72.8777"} ${(formData.get("lat") as string) || "19.076"})`,
      address: (formData.get("description") as string)?.split("]")[0]?.replace("[", "") || "Current Location",
      rescuer_status: "pending_admin",
      report_count: 1,
      action: "CREATED",
    };
    inMemoryIncidents.unshift(newRep);
    return { report: newRep, action: "CREATED" };
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

// ── Volunteer Requests Routed to Rescue Team Head ──

import { VolunteerPledge } from "@/types/rescuer";
export type { VolunteerPledge } from "@/types/rescuer";

let inMemoryVolunteerPledges: VolunteerPledge[] = [];

export async function apiSubmitVolunteerRequest(
  pledge: Partial<VolunteerPledge>
): Promise<VolunteerPledge> {
  const newPledge: VolunteerPledge = {
    id: "VOL-" + Math.floor(100 + Math.random() * 900),
    volunteerName: pledge.volunteerName || "Community Volunteer",
    contactPhone: pledge.contactPhone || "+91 98765 43210",
    assetType: pledge.assetType || "Inflatable Boat",
    capacity: pledge.capacity || "4 Persons",
    availability: pledge.availability || "Immediate",
    locationName: pledge.locationName || "Local Sector Base",
    region: pledge.region || "Regional Sector",
    lat: pledge.lat || 19.076,
    lng: pledge.lng || 72.8777,
    status: "pending_team_head",
    submittedAt: new Date().toISOString(),
  };

  inMemoryVolunteerPledges.unshift(newPledge);
  return newPledge;
}

export async function apiGetVolunteerPledgesForHead(
  officeLat?: number,
  officeLng?: number,
  radiusKm: number = 30
): Promise<VolunteerPledge[]> {
  if (!officeLat || !officeLng) return inMemoryVolunteerPledges;

  return inMemoryVolunteerPledges.filter((vol) => {
    const dist = calcDistanceKm(officeLat, officeLng, vol.lat, vol.lng);
    return dist <= radiusKm;
  });
}

export async function apiUpdateVolunteerPledgeStatus(
  pledgeId: string,
  status: "approved_by_head" | "mobilized"
): Promise<VolunteerPledge> {
  inMemoryVolunteerPledges = inMemoryVolunteerPledges.map((v) =>
    v.id === pledgeId ? { ...v, status } : v
  );
  const updated = inMemoryVolunteerPledges.find((v) => v.id === pledgeId);
  if (!updated) throw new Error("Volunteer pledge not found");
  return updated;
}

// ── District Head Connection (Admin Head Directives & Communications) ──

let inMemoryDistrictDirectives: DistrictHeadDirective[] = [
  {
    id: "DIR-ADM-001",
    adminName: "District Emergency Management Authority (District Head)",
    headUnitId: "demo-team-alpha",
    title: "Priority Flood Response & Immediate Shelter Supply Mobilization",
    message: "Water levels at Brahmapur River Basin have breached yellow alert mark. As Rescue Team Head, ensure your field squads are allocated 150 ration packs and 500L clean water immediately. Coordinate directly with your field team leaders.",
    type: "priority_dispatch",
    priority: "critical",
    issuedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    acknowledged: false,
    attachedResourceTarget: {
      type: "Food & Water Rations",
      amount: 150,
      unit: "Ration Kits",
    },
  },
  {
    id: "DIR-ADM-002",
    adminName: "Collectorate Disaster Command",
    headUnitId: "demo-team-alpha",
    title: "Weather Advisory: Cyclone Surge Wind Speed 75km/h",
    message: "IMD predicts localized gusty winds in Coastal Sectors 3 & 4. Secure all inflatable boat units and distribute life vests to all frontline rescuers before scene arrival.",
    type: "notification",
    priority: "high",
    issuedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    acknowledged: true,
    acknowledgedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    acknowledgmentNote: "Team Alpha standing by. Life jackets checked and ready.",
  },
  {
    id: "DIR-ADM-003",
    adminName: "District Medical Officer (Admin Head)",
    headUnitId: "demo-team-alpha",
    title: "Triage & Medical Kit Replenishment Directive",
    message: "First aid and IV fluid supplies at District Depot are unlocked for immediate requisition. Instruct your team members to log gathered quantities as they retrieve kits.",
    type: "order",
    priority: "normal",
    issuedAt: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    acknowledged: true,
    acknowledgedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    acknowledgmentNote: "Understood. Requisitioned 20 triage packs.",
  },
];

export async function apiGetDistrictHeadDirectives(headUnitId?: string): Promise<DistrictHeadDirective[]> {
  return inMemoryDistrictDirectives;
}

export async function apiAcknowledgeDistrictHeadDirective(
  directiveId: string,
  note?: string
): Promise<DistrictHeadDirective> {
  inMemoryDistrictDirectives = inMemoryDistrictDirectives.map((d) =>
    d.id === directiveId
      ? {
          ...d,
          acknowledged: true,
          acknowledgedAt: new Date().toISOString(),
          acknowledgmentNote: note || "Acknowledged and operational plan activated by Rescue Team Head.",
        }
      : d
  );
  const updated = inMemoryDistrictDirectives.find((d) => d.id === directiveId);
  if (!updated) throw new Error("Directive not found");
  return updated;
}

export async function apiSendDistrictHeadDirective(
  directive: Partial<DistrictHeadDirective>
): Promise<DistrictHeadDirective> {
  const newDir: DistrictHeadDirective = {
    id: "DIR-ADM-" + Math.floor(100 + Math.random() * 900),
    adminName: directive.adminName || "District Disaster Authority (Admin Head)",
    headUnitId: directive.headUnitId || "demo-team-alpha",
    title: directive.title || "Operational Directive",
    message: directive.message || "",
    type: directive.type || "order",
    priority: directive.priority || "high",
    issuedAt: new Date().toISOString(),
    acknowledged: false,
    attachedResourceTarget: directive.attachedResourceTarget,
  };
  inMemoryDistrictDirectives.unshift(newDir);
  return newDir;
}

// ── Team Members & Head-To-Member Resource Allocations ──

let inMemoryTeamMembers: TeamMember[] = [
  {
    id: "mem-01",
    name: "Officer Ramesh Patnaik",
    callsign: "SQUAD-LEAD-ALPHA",
    phone: "+91 94371 88201",
    role: "Field Squad Leader (Sector 1)",
    status: "active",
  },
  {
    id: "mem-02",
    name: "Inspector Priya Sen",
    callsign: "MED-RESCUER-02",
    phone: "+91 94371 88202",
    role: "Paramedic & Field Medical Responder",
    status: "active",
  },
  {
    id: "mem-03",
    name: "Sub-Inspector Vikram Rao",
    callsign: "BOAT-PILOT-03",
    phone: "+91 94371 88203",
    role: "Flood Inflatable Boat Operator",
    status: "standby",
  },
  {
    id: "mem-04",
    name: "Field Officer Sunita Das",
    callsign: "LOGISTICS-ALPHA",
    phone: "+91 94371 88204",
    role: "Ration & Emergency Supply Officer",
    status: "active",
  },
];

export async function apiGetTeamMembers(teamId?: string): Promise<TeamMember[]> {
  return inMemoryTeamMembers;
}

let inMemoryMemberAllocations: MemberOrderAllocation[] = [
  {
    id: "ALLOC-MEM-001",
    teamId: "demo-team-alpha",
    teamName: "NDRF Team Alpha (Regional Unit)",
    headName: "Captain Rajesh Verma",
    headPhone: "+91 98765 11001",
    headOffice: "Brahmapur Regional Disaster Command",
    memberId: "mem-01",
    memberName: "Officer Ramesh Patnaik",
    memberRole: "Field Squad Leader (Sector 1)",
    title: "Sector 1 High-Ground Evacuation & Food Distribution",
    instructions: "Proceed to Coastal Lowlands Block A. Gather assigned dry food kits and drinking water from central stores and distribute to evacuated families at Shelter Camp 1.",
    status: "gathering",
    assignedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    resources: [
      {
        key: "foodRationKits",
        name: "Food Ration Kits",
        targetAmount: 40,
        gatheredAmount: 25,
        unit: "packs",
        adminResourceName: "District Central Food Ration Stock",
      },
      {
        key: "waterLiters",
        name: "Drinking Water",
        targetAmount: 150,
        gatheredAmount: 100,
        unit: "liters",
        adminResourceName: "Regional Potable Drinking Water Depot",
      },
      {
        key: "lifeJackets",
        name: "Life Vests",
        targetAmount: 15,
        gatheredAmount: 15,
        unit: "vests",
        adminResourceName: "Civil Defense Life Jackets & Inflatable Boats Hub",
      },
    ],
  },
  {
    id: "ALLOC-MEM-002",
    teamId: "demo-team-alpha",
    teamName: "NDRF Team Alpha (Regional Unit)",
    headName: "Captain Rajesh Verma",
    headPhone: "+91 98765 11001",
    headOffice: "Brahmapur Regional Disaster Command",
    memberId: "mem-02",
    memberName: "Inspector Priya Sen",
    memberRole: "Paramedic & Field Medical Responder",
    title: "Emergency Medical Triage & First Aid Mobilization",
    instructions: "Establish mobile triage station near Sub-District Relief Center. Collect IV fluids and trauma packs from hospital depot and report status upon setup.",
    status: "gathering",
    assignedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    resources: [
      {
        key: "medicalKits",
        name: "Medical & Triage Kits",
        targetAmount: 12,
        gatheredAmount: 8,
        unit: "kits",
        adminResourceName: "District Hospital Emergency Medical Packs",
      },
      {
        key: "waterLiters",
        name: "Sterilized Water",
        targetAmount: 50,
        gatheredAmount: 30,
        unit: "liters",
        adminResourceName: "Regional Potable Drinking Water Depot",
      },
    ],
  },
];

export async function apiGetMemberAllocations(teamId?: string, memberId?: string): Promise<MemberOrderAllocation[]> {
  if (memberId) {
    return inMemoryMemberAllocations.filter((a) => a.memberId === memberId);
  }
  return inMemoryMemberAllocations;
}

export async function apiCreateMemberAllocation(
  newAlloc: Partial<MemberOrderAllocation>
): Promise<MemberOrderAllocation> {
  const item: MemberOrderAllocation = {
    id: "ALLOC-MEM-" + Math.floor(100 + Math.random() * 900),
    teamId: newAlloc.teamId || "demo-team-alpha",
    teamName: newAlloc.teamName || "NDRF Team Alpha",
    headName: newAlloc.headName || "Captain Rajesh Verma",
    headPhone: newAlloc.headPhone || "+91 98765 11001",
    headOffice: newAlloc.headOffice || "Brahmapur Regional Disaster Command",
    memberId: newAlloc.memberId || "mem-01",
    memberName: newAlloc.memberName || "Field Rescuer",
    memberRole: newAlloc.memberRole || "Field Squad Member",
    title: newAlloc.title || "Field Rescue Directive",
    instructions: newAlloc.instructions || "Fulfill allocated resource collection and execute deployment.",
    status: "pending",
    assignedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resources: newAlloc.resources || [],
  };

  inMemoryMemberAllocations.unshift(item);
  return item;
}

/**
 * Live Resource Gathering & Automatic Master/Admin Resource Deduction Engine
 * When a normal rescue team member updates gathered requirement amounts on the website,
 * the particular amount automatically increases the member's progress and REDUCES from
 * the Admin side master resource pool (capacity_used increases or available stock decreases).
 */
export async function apiUpdateMemberGatheredAmount(
  allocationId: string,
  resourceKey: string,
  deltaAmount: number
): Promise<{
  allocation: MemberOrderAllocation;
  deductedAdminResource?: ResourceItem;
  message: string;
}> {
  const allocIndex = inMemoryMemberAllocations.findIndex((a) => a.id === allocationId);
  if (allocIndex === -1) throw new Error("Allocation not found");

  const alloc = inMemoryMemberAllocations[allocIndex];
  let matchedResourceName = "";
  let actualDeducted = 0;

  const updatedResources = alloc.resources.map((res) => {
    if (res.key === resourceKey || res.name.toLowerCase() === resourceKey.toLowerCase()) {
      matchedResourceName = res.adminResourceName || res.name;
      const prevAmount = res.gatheredAmount;
      const nextAmount = Math.max(0, Math.min(res.targetAmount, prevAmount + deltaAmount));
      actualDeducted = nextAmount - prevAmount;
      return { ...res, gatheredAmount: nextAmount };
    }
    return res;
  });

  const allCompleted = updatedResources.every((r) => r.gatheredAmount >= r.targetAmount);
  const updatedStatus = allCompleted ? "completed" : "gathering";

  const updatedAlloc: MemberOrderAllocation = {
    ...alloc,
    resources: updatedResources,
    status: updatedStatus,
    updatedAt: new Date().toISOString(),
  };

  inMemoryMemberAllocations[allocIndex] = updatedAlloc;

  // ── AUTOMATIC ADMIN MASTER RESOURCE POOL REDUCTION ──
  let matchedAdminRes: ResourceItem | undefined;
  if (actualDeducted > 0) {
    // Find matching admin resource by name or type
    const resIdx = FALLBACK_RESOURCES.findIndex(
      (r) =>
        r.name.toLowerCase().includes(matchedResourceName.toLowerCase()) ||
        matchedResourceName.toLowerCase().includes(r.name.toLowerCase()) ||
        r.type.toLowerCase().includes(resourceKey.toLowerCase()) ||
        (resourceKey === "foodRationKits" && r.type === "food_stock") ||
        (resourceKey === "waterLiters" && r.name.toLowerCase().includes("water")) ||
        (resourceKey === "medicalKits" && (r.type === "medical_van" || r.name.toLowerCase().includes("medical"))) ||
        (resourceKey === "lifeJackets" && (r.type === "boat" || r.name.toLowerCase().includes("jacket"))) ||
        (resourceKey === "fuelLiters" && r.name.toLowerCase().includes("fuel"))
    );

    if (resIdx !== -1) {
      const targetRes = FALLBACK_RESOURCES[resIdx];
      const newUsed = Math.min(targetRes.capacity_total, targetRes.capacity_used + actualDeducted);
      FALLBACK_RESOURCES[resIdx] = {
        ...targetRes,
        capacity_used: newUsed,
      };
      matchedAdminRes = FALLBACK_RESOURCES[resIdx];
    }
  }

  return {
    allocation: updatedAlloc,
    deductedAdminResource: matchedAdminRes,
    message: `Logged +${actualDeducted} units. Automatically deducted from Admin Resource Pool (${matchedAdminRes?.name || matchedResourceName}).`,
  };
}



