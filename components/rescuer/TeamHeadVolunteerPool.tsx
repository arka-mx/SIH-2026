"use client";

import { useEffect, useState } from "react";
import { Users, Award, ShieldCheck, CheckCircle2, Phone, MapPin, Sparkles, Navigation } from "lucide-react";
import { apiGetVolunteerPledgesForHead, apiUpdateVolunteerPledgeStatus, VolunteerPledge } from "@/lib/api";

interface TeamHeadVolunteerPoolProps {
  officeLat?: number;
  officeLng?: number;
  officeName?: string;
  regionRadiusKm?: number;
  isTeamHead?: boolean;
}

export function TeamHeadVolunteerPool({
  officeLat,
  officeLng,
  officeName,
  regionRadiusKm = 35,
  isTeamHead = true,
}: TeamHeadVolunteerPoolProps) {
  const regionLabel = officeName || "your office jurisdiction";
  const [pledges, setPledges] = useState<VolunteerPledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadPledges() {
    try {
      setLoading(true);
      const data = await apiGetVolunteerPledgesForHead(officeLat, officeLng, regionRadiusKm);
      setPledges(data);
    } catch (err) {
      console.warn("Could not load volunteer pledges for head:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPledges();
    const interval = setInterval(loadPledges, 4000);
    return () => clearInterval(interval);
  }, [officeLat, officeLng, regionRadiusKm]);

  async function handleApprove(id: string) {
    setActionLoading(id);
    try {
      await apiUpdateVolunteerPledgeStatus(id, "approved_by_head");
      await loadPledges();
    } catch (err) {
      console.warn("Approval error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMobilize(id: string) {
    setActionLoading(id);
    try {
      await apiUpdateVolunteerPledgeStatus(id, "mobilized");
      await loadPledges();
    } catch (err) {
      console.warn("Mobilize error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  if (!isTeamHead) return null;

  return (
    <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300 flex items-center gap-1">
              <Award size={12} /> Rescue Team Head Direct Stream
            </span>
            <span className="text-xs font-bold text-stone-500">
              Region: {regionLabel}
            </span>
          </div>
          <h2 className="text-base font-extrabold text-stone-900 mt-1 flex items-center gap-2">
            <Users size={20} className="text-purple-600" />
            Regional Volunteer & Equipment Mobilization Pool
          </h2>
        </div>

        <span className="text-xs bg-purple-50 text-purple-900 font-bold px-3 py-1 rounded-full border border-purple-200">
          {pledges.length} Pledged Assets
        </span>
      </div>

      {loading && pledges.length === 0 ? (
        <div className="py-6 text-center text-xs text-stone-400 font-medium">
          Loading regional community volunteer pledges...
        </div>
      ) : pledges.length === 0 ? (
        <div className="py-6 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
          No new volunteer resource pledges submitted in {regionLabel}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pledges.map((vol) => {
            const isAssignedByAdmin = vol.status === "assigned_by_admin";
            const isApproved = vol.status === "approved_by_head" || vol.status === "mobilized";
            const isMobilized = vol.status === "mobilized";

            return (
              <div
                key={vol.id}
                className="p-4 bg-slate-900 text-white border border-slate-800 shadow-xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                        {vol.volunteerName}
                      </h4>
                      <p className="text-[11px] text-purple-300 font-medium flex items-center gap-1 mt-0.5">
                        <MapPin size={12} /> {vol.locationName} ({vol.region})
                      </p>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 border whitespace-nowrap ${
                      isMobilized
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : isApproved
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                        : isAssignedByAdmin
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    }`}>
                      {isMobilized
                        ? "⚡ Mobilized to Scene"
                        : isApproved
                        ? "✓ Approved by Head"
                        : isAssignedByAdmin
                        ? "👑 Assigned by Admin Head"
                        : "⏳ Pending Head Review"}
                    </span>
                  </div>

                  <div className="mt-3 p-2.5 bg-white/5 rounded-xl space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-stone-200">
                      <span className="text-stone-400">Pledged Asset:</span>
                      <strong className="text-emerald-400 font-bold">{vol.assetType}</strong>
                    </div>
                    <div className="flex justify-between text-stone-200">
                      <span className="text-stone-400">Capacity:</span>
                      <strong>{vol.capacity}</strong>
                    </div>
                    <div className="flex justify-between text-stone-200">
                      <span className="text-stone-400">Availability:</span>
                      <strong className="text-purple-300">{vol.availability}</strong>
                    </div>
                    <div className="flex justify-between text-stone-200 pt-1 border-t border-white/10">
                      <span className="text-stone-400">Contact:</span>
                      <span className="text-amber-300 font-bold flex items-center gap-1">
                        <Phone size={11} /> {vol.contactPhone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-end gap-2">
                  {!isApproved && (
                    <button
                      type="button"
                      onClick={() => handleApprove(vol.id)}
                      disabled={actionLoading === vol.id}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 size={13} /> Approve Resource
                    </button>
                  )}

                  {isApproved && !isMobilized && (
                    <button
                      type="button"
                      onClick={() => handleMobilize(vol.id)}
                      disabled={actionLoading === vol.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={13} /> Mobilize to Scene
                    </button>
                  )}

                  {isMobilized && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Active in Operations
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
