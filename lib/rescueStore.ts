import { calcDistanceKm } from "@/lib/api";

export interface RescueReportEvent {
  id: string;
  incident_id: string;
  device_id: string;
  type: string;
  message: string;
  latitude: number;
  longitude: number;
  location_accuracy?: number;
  ip_address: string;
  user_agent?: string;
  idempotency_key?: string;
  created_at: string;
}

export interface ActiveRescueIncident {
  id: string;
  incident_id: string;
  device_id: string;
  status: "unverified" | "verified" | "in_progress" | "resolved" | "cancelled";
  severity: "critical" | "high" | "moderate" | "low";
  latitude: number;
  longitude: number;
  location_wkt?: string;
  address?: string;
  description: string;
  type: string;
  report_count: number;
  reports: RescueReportEvent[];
  assigned_rescuer_id?: string;
  assigned_rescuer?: any;
  rescuer_status?: "pending_admin" | "assigned" | "admin_denied_auto_routed" | "arrived";
  denied_by_admin?: boolean;
  assignment_source?: "admin_dispatch" | "nearest_fallback_admin_denied";
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface SubmitRescuePayload {
  device_id: string;
  type: string;
  message?: string;
  latitude: number;
  longitude: number;
  location_accuracy?: number;
  ip_address: string;
  user_agent?: string;
  idempotency_key?: string;
  address?: string;
}

export interface RescueSubmissionResult {
  success: boolean;
  incident_id: string;
  action: "CREATED" | "UPDATED" | "IDEMPOTENT_DUPLICATE";
  incident: ActiveRescueIncident;
  report: RescueReportEvent;
}

// In-Memory state fallback for incidents and events
let inMemoryIncidents: ActiveRescueIncident[] = [];
let inMemoryEvents: RescueReportEvent[] = [];
let idempotencyMap = new Map<string, RescueSubmissionResult>();

// Concurrency Mutex Lock per device_id to handle simultaneous requests
const deviceLocks = new Map<string, Promise<any>>();

function acquireLock(deviceId: string): () => void {
  let release: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    release = resolve;
  });
  
  const existing = deviceLocks.get(deviceId) || Promise.resolve();
  const chained = existing.then(() => lockPromise);
  deviceLocks.set(deviceId, chained);

  return () => {
    release();
    if (deviceLocks.get(deviceId) === chained) {
      deviceLocks.delete(deviceId);
    }
  };
}

/**
 * Core Anonymous Rescue Deduplication & Incident Creation Engine
 */
export async function processRescueSubmission(payload: SubmitRescuePayload): Promise<RescueSubmissionResult> {
  const releaseLock = acquireLock(payload.device_id);

  try {
    // 1. Idempotency Check
    if (payload.idempotency_key && idempotencyMap.has(payload.idempotency_key)) {
      const cached = idempotencyMap.get(payload.idempotency_key)!;
      return { ...cached, action: "IDEMPOTENT_DUPLICATE" };
    }

    const deviceId = payload.device_id || "dev-anonymous-client";
    const ip = payload.ip_address || "127.0.0.1";
    const nowIso = new Date().toISOString();

    // 2. Find active incident for this device_id (status != resolved && status != cancelled)
    let activeIncIndex = inMemoryIncidents.findIndex(
      (inc) => inc.device_id === deviceId && inc.status !== "resolved" && inc.status !== "cancelled"
    );

    let result: RescueSubmissionResult;

    if (activeIncIndex !== -1) {
      // ── STEP 3: Active Incident Exists -> APPEND REPORT EVENT & UPDATE INCIDENT ──
      const existingInc = inMemoryIncidents[activeIncIndex];

      const reportEvent: RescueReportEvent = {
        id: "RPT-" + Math.floor(1000 + Math.random() * 9000) + "-" + Date.now().toString(36),
        incident_id: existingInc.incident_id,
        device_id: deviceId,
        type: payload.type || existingInc.type,
        message: payload.message || "Updated rescue status",
        latitude: payload.latitude,
        longitude: payload.longitude,
        location_accuracy: payload.location_accuracy || 10,
        ip_address: ip,
        user_agent: payload.user_agent,
        idempotency_key: payload.idempotency_key,
        created_at: nowIso,
      };

      inMemoryEvents.push(reportEvent);

      const updatedReports = [...existingInc.reports, reportEvent];
      const updatedInc: ActiveRescueIncident = {
        ...existingInc,
        type: payload.type || existingInc.type,
        description: payload.message ? `${existingInc.description} | ${payload.message}` : existingInc.description,
        latitude: payload.latitude,
        longitude: payload.longitude,
        address: payload.address || existingInc.address,
        report_count: updatedReports.length,
        reports: updatedReports,
        updated_at: nowIso,
      };

      inMemoryIncidents[activeIncIndex] = updatedInc;

      result = {
        success: true,
        incident_id: existingInc.incident_id,
        action: "UPDATED",
        incident: updatedInc,
        report: reportEvent,
      };
    } else {
      // ── STEP 4: No Active Incident Exists -> CREATE NEW INCIDENT ──
      const newIncId = "INC-" + Math.floor(1000 + Math.random() * 9000);

      const reportEvent: RescueReportEvent = {
        id: "RPT-" + Math.floor(1000 + Math.random() * 9000) + "-" + Date.now().toString(36),
        incident_id: newIncId,
        device_id: deviceId,
        type: payload.type || "flood",
        message: payload.message || "Initial rescue request",
        latitude: payload.latitude,
        longitude: payload.longitude,
        location_accuracy: payload.location_accuracy || 10,
        ip_address: ip,
        user_agent: payload.user_agent,
        idempotency_key: payload.idempotency_key,
        created_at: nowIso,
      };

      inMemoryEvents.push(reportEvent);

      const newInc: ActiveRescueIncident = {
        id: newIncId,
        incident_id: newIncId,
        device_id: deviceId,
        status: "unverified",
        severity: "high",
        latitude: payload.latitude,
        longitude: payload.longitude,
        location_wkt: `POINT(${payload.longitude} ${payload.latitude})`,
        address: payload.address || "Target Sector Location",
        description: payload.message || `Emergency Request (${payload.type.toUpperCase()})`,
        type: payload.type || "flood",
        report_count: 1,
        reports: [reportEvent],
        created_at: nowIso,
        updated_at: nowIso,
      };

      inMemoryIncidents.unshift(newInc);

      result = {
        success: true,
        incident_id: newIncId,
        action: "CREATED",
        incident: newInc,
        report: reportEvent,
      };
    }

    if (payload.idempotency_key) {
      idempotencyMap.set(payload.idempotency_key, result);
    }

    return result;
  } finally {
    releaseLock();
  }
}

/**
 * Retrieves all incidents (optionally filtered by active status)
 */
export function getAllRescueIncidents(): ActiveRescueIncident[] {
  return inMemoryIncidents;
}

/**
 * Retrieves an incident by incident_id
 */
export function getRescueIncidentById(incidentId: string): ActiveRescueIncident | null {
  return inMemoryIncidents.find((i) => i.incident_id === incidentId || i.id === incidentId) || null;
}

/**
 * Retrieves active incident for a specific device_id
 */
export function getActiveIncidentForDevice(deviceId: string): ActiveRescueIncident | null {
  return inMemoryIncidents.find(
    (i) => i.device_id === deviceId && i.status !== "resolved" && i.status !== "cancelled"
  ) || null;
}

/**
 * Resolves or updates status of an incident
 */
export function updateRescueIncidentStatus(
  incidentId: string,
  status: ActiveRescueIncident["status"],
  extraProps?: Partial<ActiveRescueIncident>
): ActiveRescueIncident | null {
  const index = inMemoryIncidents.findIndex((i) => i.incident_id === incidentId || i.id === incidentId);
  if (index === -1) return null;

  const nowIso = new Date().toISOString();
  const updated: ActiveRescueIncident = {
    ...inMemoryIncidents[index],
    status,
    ...extraProps,
    updated_at: nowIso,
    ...(status === "resolved" ? { resolved_at: nowIso } : {}),
  };

  inMemoryIncidents[index] = updated;
  return updated;
}

/**
 * Multi-device Corroboration Query:
 * Finds incidents & reports within spatial radius and temporal window to count unique devices vs total reports.
 */
export function queryCorroboratedCluster(
  lat: number,
  lng: number,
  radiusKm: number = 0.5,
  windowMinutes: number = 15
) {
  const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const nearbyIncidents = inMemoryIncidents.filter((inc) => {
    if (inc.created_at < cutoffTime) return false;
    const dist = calcDistanceKm(lat, lng, inc.latitude, inc.longitude);
    return dist <= radiusKm;
  });

  const uniqueDeviceIds = new Set(nearbyIncidents.map((i) => i.device_id));
  const totalReportsCount = nearbyIncidents.reduce((sum, inc) => sum + inc.report_count, 0);
  const uniqueIpAddresses = new Set(
    nearbyIncidents.flatMap((inc) => inc.reports.map((r) => r.ip_address))
  );

  return {
    nearby_incidents: nearbyIncidents,
    unique_devices_count: uniqueDeviceIds.size,
    total_reports_count: totalReportsCount,
    unique_ips_count: uniqueIpAddresses.size,
    is_multi_device_corroborated: uniqueDeviceIds.size >= 3,
  };
}

/**
 * Reset memory state (For automated unit tests)
 */
export function _resetRescueStore(): void {
  inMemoryIncidents = [];
  inMemoryEvents = [];
  idempotencyMap.clear();
  deviceLocks.clear();
}
