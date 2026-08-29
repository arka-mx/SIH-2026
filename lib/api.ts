const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
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

// ── Citizen Endpoints ──

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
