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
  loggedInAt: string;
}

const RESCUER_SESSION_KEY = "sih_rescuer_user_session";

export function saveRescuerSession(session: RescuerUserSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RESCUER_SESSION_KEY, JSON.stringify(session));
}

export function getRescuerSession(): RescuerUserSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(RESCUER_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RescuerUserSession;
  } catch {
    return null;
  }
}

export function clearRescuerSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RESCUER_SESSION_KEY);
}
