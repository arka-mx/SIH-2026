"use client";

import { MapPin } from "lucide-react";
import { useAdminLocation } from "@/lib/adminLocation";

/**
 * Read-only view of the admin's operating area on the Profile page.
 * It is set from the dashboard status bar (AdminLocationControl); this just
 * reflects whatever is stored.
 */
export function AdminLocationField() {
  const { location, ready } = useAdminLocation();

  return (
    <div className="border border-slate-200 bg-slate-50 p-4">
      <MapPin size={16} className="mb-3 text-[color:var(--a-accent)]" />
      <p className="eyebrow">Operating area</p>
      <p className="mt-1 text-sm font-bold text-slate-900">
        {!ready ? "…" : location ? location.label : "Not set — choose one on the dashboard"}
      </p>
      {ready && location && (
        <p className="mt-1 text-[11px] font-semibold text-slate-500">
          {location.source === "gps" ? "From current location" : "Set manually"}
          {location.lat != null && location.lng != null
            ? ` · ${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`
            : ""}
        </p>
      )}
    </div>
  );
}
