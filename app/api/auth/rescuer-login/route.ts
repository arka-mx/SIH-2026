import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth-session";
import { verifyFirebaseIdToken, type FirebaseIdentity } from "@/lib/firebase-verify";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      idToken,
      password,
      rescuerId,
      isTeamHead,
      officeName,
      officeLat,
      officeLng,
      regionRadiusKm,
    } = body ?? {};

    const unitId = String(rescuerId || process.env.NEXT_PUBLIC_DEFAULT_RESCUER_ID || "demo-team-alpha").trim();

    let identity: FirebaseIdentity;
    if (idToken) {
      try {
        identity = await verifyFirebaseIdToken(String(idToken));
      } catch (err) {
        console.warn("Firebase ID token rejected:", err);
        return NextResponse.json({ error: "Google sign-in could not be verified" }, { status: 401 });
      }
    } else if (
      password &&
      process.env.NEXT_PUBLIC_DEFAULT_RESCUER_PASSWORD &&
      String(password) === process.env.NEXT_PUBLIC_DEFAULT_RESCUER_PASSWORD
    ) {
      identity = { uid: `demo:${unitId}`, email: "", name: "Field Rescuer" };
    } else {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    await createSession({
      role: "rescuer",
      sub: identity.uid,
      email: identity.email,
      name: identity.name,
      picture: identity.picture,
      rescuerId: unitId,
      isTeamHead: Boolean(isTeamHead),
      officeName: String(officeName || "Regional Base Command"),
      officeLat: Number(officeLat) || 0,
      officeLng: Number(officeLng) || 0,
      regionRadiusKm: Number(regionRadiusKm) || 25,
    });

    return NextResponse.json({ ok: true, redirect: `/rescuer/${encodeURIComponent(unitId)}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
