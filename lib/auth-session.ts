import { cookies } from "next/headers";
import { SESSION_COOKIE, signSessionToken, verifySessionToken } from "@/lib/jwt-edge";

export { SESSION_COOKIE };

export interface AdminSession {
  role: "admin";
  sub: string;
  name?: string;
}

export interface RescuerSession {
  role: "rescuer";
  sub: string; // Google/Firebase uid (or "demo:<unit>")
  email: string;
  name: string;
  picture?: string;
  rescuerId: string; // unit / callsign route segment
  isTeamHead: boolean;
  officeName: string;
  officeLat: number;
  officeLng: number;
  regionRadiusKm: number;
}

export type Session = AdminSession | RescuerSession;

const MAX_AGE: Record<Session["role"], number> = {
  admin: 60 * 60 * 8, // 8 hours
  rescuer: 60 * 60 * 12, // 12 hours
};

export async function createSession(session: Session): Promise<void> {
  const maxAge = MAX_AGE[session.role];
  const token = await signSessionToken({ ...session }, maxAge);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  // Best-effort cleanup of the pre-JWT cookies.
  store.delete("momentum_admin_session");
  store.delete("momentum_rescuer_session");
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken<Session>(token);
}
