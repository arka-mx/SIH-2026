import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAuthority } from "@/lib/auth";
import { confirmDispatch } from "@/lib/allocationService";

/**
 * POST /api/allocations/confirm   { report_id, resource_id }
 *
 * Commits a resource to an incident: charges the resource's capacity, flips it
 * to `en_route`, moves the incident to `in_progress`, records the allocation
 * and fires the emergency alert. Idempotent per (report_id, resource_id).
 */
export async function POST(req: NextRequest) {
  try {
    if (!isAuthorizedAuthority(req)) {
      return NextResponse.json(
        { error: "Unauthorized authority token" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const report_id = String(body.report_id || "").trim();
    const resource_id = String(body.resource_id || "").trim();
    if (!report_id || !resource_id) {
      return NextResponse.json(
        { error: "Missing required fields: report_id, resource_id" },
        { status: 400 }
      );
    }

    const result = await confirmDispatch({
      reportId: report_id,
      resourceId: resource_id,
      confirmedBy: "authority",
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      {
        allocation: {
          id: result.allocation.id,
          report_id: result.allocation.report_id,
          resource_id: result.allocation.resource_id,
          status: result.allocation.status,
          demand: result.allocation.demand,
          allocated: result.allocation.allocated,
          fully_covered: result.allocation.fully_covered,
          distance_km: result.allocation.distance_km,
          eta_min: result.allocation.eta_min,
          reason: result.allocation.reason,
          recommended_at: result.allocation.recommended_at,
          confirmed_at: result.allocation.confirmed_at,
        },
        report: result.report,
        resource: result.resource,
        idempotent: result.idempotent,
      },
      { status: result.idempotent ? 200 : 201 }
    );
  } catch (err) {
    console.error("POST /api/allocations/confirm error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to confirm allocation" },
      { status: 500 }
    );
  }
}
