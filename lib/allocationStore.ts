/**
 * Allocation Ledger
 * =================
 * Records every resource→incident match the console makes: first as a
 * `recommended` line the moment an incident is verified, then promoted to
 * `en_route` when an operator confirms the dispatch, and finally `resolved`
 * when the incident closes.
 *
 * Exactly one active allocation exists per incident at a time. Confirming a
 * different resource supersedes the previous one (and its held capacity is
 * released by the caller).
 */

export type AllocationStatus =
  | "recommended"
  | "en_route"
  | "at_scene"
  | "resolved"
  | "superseded";

export interface StoredAllocation {
  id: string;
  report_id: string;
  resource_id: string;
  resource_name: string;
  resource_type: string;
  status: AllocationStatus;
  demand: number;
  allocated: number;
  fully_covered: boolean;
  distance_km: number;
  eta_min: number;
  reason: string;
  incident_type: string;
  incident_lat: number;
  incident_lng: number;
  resource_lat: number;
  resource_lng: number;
  recommended_at: string;
  confirmed_at?: string;
  confirmed_by?: string;
  updated_at: string;
}

const ACTIVE: AllocationStatus[] = ["recommended", "en_route", "at_scene"];

let ledger: StoredAllocation[] = [];

function id(): string {
  return "ALC-" + Math.floor(1000 + Math.random() * 9000) + "-" + Date.now().toString(36);
}

export function getActiveAllocations(): StoredAllocation[] {
  return ledger.filter((a) => ACTIVE.includes(a.status)).map((a) => ({ ...a }));
}

export function getAllAllocations(): StoredAllocation[] {
  return ledger.map((a) => ({ ...a }));
}

export function getAllocationForReport(reportId: string): StoredAllocation | null {
  return (
    ledger.find(
      (a) => a.report_id === reportId && ACTIVE.includes(a.status)
    ) || null
  );
}

type AllocationInput = Omit<
  StoredAllocation,
  "id" | "status" | "recommended_at" | "confirmed_at" | "confirmed_by" | "updated_at"
>;

/**
 * Attach (or refresh) the non-binding `recommended` allocation for an incident.
 * No-ops if an active allocation already exists for that incident — we never
 * clobber an operator's confirmed dispatch with a fresh recommendation.
 */
export function upsertRecommendation(input: AllocationInput): StoredAllocation {
  const existing = getAllocationForReport(input.report_id);
  if (existing) {
    if (existing.status !== "recommended") return existing;
    // Refresh the recommendation in place.
    Object.assign(existing, input, { updated_at: new Date().toISOString() });
    return { ...existing };
  }
  const now = new Date().toISOString();
  const rec: StoredAllocation = {
    ...input,
    id: id(),
    status: "recommended",
    recommended_at: now,
    updated_at: now,
  };
  ledger.unshift(rec);
  return { ...rec };
}

export interface ConfirmResult {
  allocation: StoredAllocation;
  superseded: StoredAllocation | null;
  idempotent: boolean;
}

/**
 * Promote an incident's allocation to a confirmed dispatch. If an active
 * allocation for a *different* resource exists it is marked `superseded` and
 * returned so the caller can hand its capacity back.
 */
export function confirmAllocation(
  input: AllocationInput,
  confirmedBy = "authority"
): ConfirmResult {
  const now = new Date().toISOString();
  const existing = getAllocationForReport(input.report_id);

  if (existing && existing.resource_id === input.resource_id) {
    if (existing.status === "recommended") {
      Object.assign(existing, input, {
        status: "en_route",
        confirmed_at: now,
        confirmed_by: confirmedBy,
        updated_at: now,
      });
      return { allocation: { ...existing }, superseded: null, idempotent: false };
    }
    // Already confirmed for this resource — nothing to do.
    return { allocation: { ...existing }, superseded: null, idempotent: true };
  }

  let superseded: StoredAllocation | null = null;
  if (existing) {
    existing.status = "superseded";
    existing.updated_at = now;
    superseded = { ...existing };
  }

  const alloc: StoredAllocation = {
    ...input,
    id: id(),
    status: "en_route",
    recommended_at: existing?.recommended_at || now,
    confirmed_at: now,
    confirmed_by: confirmedBy,
    updated_at: now,
  };
  ledger.unshift(alloc);
  return { allocation: { ...alloc }, superseded, idempotent: false };
}

export function advanceAllocationStatus(
  reportId: string,
  status: Extract<AllocationStatus, "at_scene">
): StoredAllocation | null {
  const a = getAllocationForReport(reportId);
  if (!a) return null;
  const row = ledger.find((x) => x.id === a.id)!;
  row.status = status;
  row.updated_at = new Date().toISOString();
  return { ...row };
}

/**
 * Close out an incident's allocation. Returns it (with `allocated`) so the
 * caller can release the held capacity back to the resource pool.
 */
export function resolveAllocationForReport(
  reportId: string
): StoredAllocation | null {
  const a = getAllocationForReport(reportId);
  if (!a) return null;
  const row = ledger.find((x) => x.id === a.id)!;
  row.status = "resolved";
  row.updated_at = new Date().toISOString();
  return { ...row };
}

export function _resetAllocationStore(): void {
  ledger = [];
}
