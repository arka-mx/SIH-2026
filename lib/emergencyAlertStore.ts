/**
 * Emergency Alert System — server-side store.
 *
 * A single entry point, `dispatchEmergencyAlert`, is called by the backend
 * whenever a situation crosses an action threshold:
 *
 *   • a citizen SOS becomes a VERIFIED critical/high disaster
 *   • an evacuation order is issued
 *   • a rescue resource / team is deployed
 *   • a shelter is allocated to affected people
 *
 * Each dispatch does two things:
 *   1. Sends a concise SMS (alert type · location · severity · shelter /
 *      instructions) to the relevant audience through `lib/smsProvider`.
 *   2. Records the same alert as an in-app notification, readable per audience
 *      (and per citizen device) from `GET /api/alerts`.
 *
 * The store is in-process (like the rest of this prototype's live state) and
 * best-effort: a provider failure is captured on the alert record, never thrown.
 */

import {
  sendEmergencySms,
  smsProviderName,
  isSmsConfigured,
  type SmsDeliveryResult,
} from "@/lib/smsProvider";

export type AlertAudience = "citizens" | "responders" | "authorities";

export type AlertCategory =
  | "disaster_verified"
  | "evacuation"
  | "resource_deployment"
  | "shelter_allocation"
  | "custom";

export type AlertSeverity = "critical" | "high" | "moderate" | "low";

export interface AlertRecipient {
  id: string;
  name?: string;
  phone: string;
  audience: AlertAudience;
  /** Optional device id so a citizen only gets alerts near their own SOS. */
  device_id?: string;
  latitude?: number;
  longitude?: number;
  registered_at: string;
}

export interface EmergencyAlert {
  id: string;
  category: AlertCategory;
  alert_type: string;
  severity: AlertSeverity;
  headline: string;
  body: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  shelter?: string;
  instructions?: string;
  audiences: AlertAudience[];
  incident_id?: string;
  sms: {
    provider: string;
    configured: boolean;
    attempted: number;
    sent: number;
    failed: number;
    simulated: number;
    results: SmsDeliveryResult[];
  };
  /** Devices/audiences that have marked this alert read. */
  read_by: string[];
  created_at: string;
}

export interface DispatchEmergencyAlertInput {
  category: AlertCategory;
  alertType: string;
  severity: AlertSeverity;
  audiences: AlertAudience[];
  locationName?: string;
  latitude?: number;
  longitude?: number;
  shelter?: string;
  instructions?: string;
  incidentId?: string;
  /** Extra ad-hoc phone numbers to notify beyond the registered directory. */
  extraPhones?: string[];
  /** Collapse duplicate dispatches (e.g. re-scored verification) within a window. */
  dedupeKey?: string;
  dedupeWindowMs?: number;
}

const MAX_ALERTS = 200;
const SMS_RADIUS_KM = 25; // citizens within this range of the event get an SMS

let alerts: EmergencyAlert[] = [];
let recipients: AlertRecipient[] = [];
const recentDispatchKeys = new Map<string, number>();

function rid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CATEGORY_LABEL: Record<AlertCategory, string> = {
  disaster_verified: "VERIFIED DISASTER",
  evacuation: "EVACUATION ORDER",
  resource_deployment: "RESPONSE DEPLOYED",
  shelter_allocation: "SHELTER ALLOCATED",
  custom: "EMERGENCY ALERT",
};

/** Build the concise SMS body: type · location · severity · shelter/instructions. */
export function buildAlertSms(input: DispatchEmergencyAlertInput): { headline: string; body: string } {
  const tag = CATEGORY_LABEL[input.category];
  const sev = input.severity.toUpperCase();
  const where = input.locationName?.trim() || "your area";
  const headline = `${tag}: ${input.alertType} — ${where}`;

  const parts = [`[${tag}] ${input.alertType} near ${where}. Severity: ${sev}.`];
  if (input.shelter) parts.push(`Shelter: ${input.shelter}.`);
  if (input.instructions) parts.push(input.instructions.trim());
  else if (input.category === "evacuation") parts.push("Evacuate now via the nearest safe route. Do not wait.");
  else if (input.category === "disaster_verified") parts.push("Move to safety and follow official instructions.");
  parts.push("- Disaster Response Command");

  return { headline, body: parts.join(" ") };
}

function resolveSmsRecipients(input: DispatchEmergencyAlertInput): string[] {
  const audienceSet = new Set(input.audiences);
  const hasEventLoc =
    typeof input.latitude === "number" && typeof input.longitude === "number";

  const fromDirectory = recipients
    .filter((r) => audienceSet.has(r.audience))
    .filter((r) => {
      // Responders & authorities always get it; citizens only if nearby (or if
      // we have no coordinates to filter on).
      if (r.audience !== "citizens") return true;
      if (!hasEventLoc || typeof r.latitude !== "number" || typeof r.longitude !== "number") return true;
      return distanceKm(input.latitude!, input.longitude!, r.latitude, r.longitude) <= SMS_RADIUS_KM;
    })
    .map((r) => r.phone);

  return [...fromDirectory, ...(input.extraPhones ?? [])].filter(Boolean);
}

export async function dispatchEmergencyAlert(
  input: DispatchEmergencyAlertInput
): Promise<EmergencyAlert> {
  // De-duplicate rapid repeat dispatches (verification re-scoring fires often).
  if (input.dedupeKey) {
    const now = Date.now();
    const windowMs = input.dedupeWindowMs ?? 10 * 60 * 1000;
    const last = recentDispatchKeys.get(input.dedupeKey);
    for (const [k, t] of recentDispatchKeys) {
      if (now - t > 60 * 60 * 1000) recentDispatchKeys.delete(k);
    }
    if (last && now - last < windowMs) {
      const existing = alerts.find((a) => a.incident_id === input.incidentId && a.category === input.category);
      if (existing) return existing;
    }
    recentDispatchKeys.set(input.dedupeKey, now);
  }

  const { headline, body } = buildAlertSms(input);
  const phones = resolveSmsRecipients(input);

  let results: SmsDeliveryResult[] = [];
  try {
    results = phones.length ? await sendEmergencySms(phones, body) : [];
  } catch (err) {
    console.error("dispatchEmergencyAlert: SMS gateway threw unexpectedly:", err);
  }

  const alert: EmergencyAlert = {
    id: rid("ALERT"),
    category: input.category,
    alert_type: input.alertType,
    severity: input.severity,
    headline,
    body,
    location_name: input.locationName,
    latitude: input.latitude,
    longitude: input.longitude,
    shelter: input.shelter,
    instructions: input.instructions,
    audiences: input.audiences,
    incident_id: input.incidentId,
    sms: {
      provider: smsProviderName(),
      configured: isSmsConfigured(),
      attempted: results.length,
      sent: results.filter((r) => r.state === "sent").length,
      failed: results.filter((r) => r.state === "failed").length,
      simulated: results.filter((r) => r.state === "simulated").length,
      results,
    },
    read_by: [],
    created_at: new Date().toISOString(),
  };

  alerts.unshift(alert);
  if (alerts.length > MAX_ALERTS) alerts = alerts.slice(0, MAX_ALERTS);

  return alert;
}

export interface GetAlertsQuery {
  audience?: AlertAudience;
  deviceId?: string;
  since?: string;
  limit?: number;
}

export function getAlerts(query: GetAlertsQuery = {}): EmergencyAlert[] {
  let list = alerts;

  if (query.audience) {
    list = list.filter((a) => a.audiences.includes(query.audience!));
  }
  if (query.since) {
    const cutoff = new Date(query.since).getTime();
    if (!Number.isNaN(cutoff)) list = list.filter((a) => new Date(a.created_at).getTime() > cutoff);
  }

  const limit = Math.min(Math.max(query.limit ?? 50, 1), MAX_ALERTS);
  return list.slice(0, limit);
}

/** Mark an alert read for a given reader key (device id or audience name). */
export function markAlertRead(alertId: string, readerKey: string): EmergencyAlert | null {
  const alert = alerts.find((a) => a.id === alertId);
  if (!alert) return null;
  if (readerKey && !alert.read_by.includes(readerKey)) alert.read_by.push(readerKey);
  return alert;
}

export function registerRecipient(
  input: Omit<AlertRecipient, "id" | "registered_at">
): AlertRecipient {
  const existing = recipients.find(
    (r) => r.phone === input.phone && r.audience === input.audience && r.device_id === input.device_id
  );
  if (existing) {
    Object.assign(existing, input);
    return existing;
  }
  const recipient: AlertRecipient = {
    ...input,
    id: rid("RCPT"),
    registered_at: new Date().toISOString(),
  };
  recipients.push(recipient);
  return recipient;
}

export function getRecipients(audience?: AlertAudience): AlertRecipient[] {
  return audience ? recipients.filter((r) => r.audience === audience) : [...recipients];
}

/** Test helper. */
export function _resetEmergencyAlertStore(): void {
  alerts = [];
  recipients = [];
  recentDispatchKeys.clear();
}
