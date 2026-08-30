"use client";

export interface RescuerUserSession {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
  isTeamHead: boolean;
  officeName: string;
  officeLat: number;
  officeLng: number;
  regionRadiusKm: number;
}

/**
 * Reads the current rescuer session from the server (JWT cookie is HttpOnly).
 * Returns null when not signed in as a rescuer.
 */
export async function fetchRescuerSession(): Promise<RescuerUserSession | null> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return null;
    const { user } = await res.json();
    if (!user || user.role !== "rescuer") return null;
    return {
      id: user.sub,
      email: user.email ?? "",
      name: user.name ?? "",
      photoUrl: user.picture,
      isTeamHead: Boolean(user.isTeamHead),
      officeName: user.officeName ?? "",
      officeLat: Number(user.officeLat) || 0,
      officeLng: Number(user.officeLng) || 0,
      regionRadiusKm: Number(user.regionRadiusKm) || 25,
    };
  } catch {
    return null;
  }
}
