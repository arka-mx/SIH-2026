"use client";

import { getOrCreateDeviceId } from "@/lib/device";

/**
 * Retrieves the device-specific unique Device ID.
 * Locked strictly to the client device (NOT network or IP specific).
 * User cannot regenerate it.
 */
export async function fetchIpBasedSessionId(): Promise<string> {
  return getOrCreateDeviceId();
}

/**
 * Returns the immutable device-specific unique Device ID.
 */
export function getOrCreateSessionId(): string {
  return getOrCreateDeviceId();
}

/**
 * Always returns the exact same immutable device-specific unique Device ID.
 * Regeneration is disabled.
 */
export function createNewSessionId(): string {
  return getOrCreateDeviceId();
}
