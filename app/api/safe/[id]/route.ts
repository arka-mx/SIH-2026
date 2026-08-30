import { NextRequest, NextResponse } from "next/server";
import { putSafeShare, getSafeShare } from "@/lib/safeShareStore";
import { isSafeSnapshot } from "@/lib/safeShare";
import { resolveSafeStatus } from "@/lib/safeStatus";

/** Publish / refresh a citizen's "I'm safe" check-in snapshot for public viewing. */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);

    const snapshot = { ...(body || {}), id: (body?.id as string) || id };
    if (!isSafeSnapshot(snapshot)) {
      return NextResponse.json({ error: "Invalid safe check-in payload" }, { status: 400 });
    }

    const saved = await putSafeShare(snapshot);
    return NextResponse.json({ ok: true, share: saved });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to publish safe check-in" },
      { status: 500 }
    );
  }
}

export const POST = PUT;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const view = (await resolveSafeStatus(id)) || (await getSafeShare(id));
  if (!view) {
    return NextResponse.json({ error: "Safe check-in not found" }, { status: 404 });
  }
  return NextResponse.json(view);
}
