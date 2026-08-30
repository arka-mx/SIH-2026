import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    globalAutoDispatchEnabled: true,
    radicalRegionsAutoAlertEnabled: true,
    minReportClusterForAutoDispatch: 2,
    maxAutoDispatchRadiusKm: 5,
    requireAdminPostConfirmation: true,
    regions: [],
  });
}
