"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import {
  apiAssignVolunteerPledgeToTeam,
  apiGetAllRegisteredTeamHeads,
  apiGetAllVolunteerPledges,
  TeamHeadContactRecord,
  VolunteerPledge,
} from "@/lib/api";
import {
  MapPin,
  Phone,
  RotateCw,
  Sparkles,
  UserCheck,
  Send,
  Building,
  Crown,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function VolunteersPage() {
  const [pledges, setPledges] = useState<VolunteerPledge[]>([]);
  const [teamHeads, setTeamHeads] = useState<TeamHeadContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedTeamPerPledge, setSelectedTeamPerPledge] = useState<Record<string, string>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const [allPledges, heads] = await Promise.all([
        apiGetAllVolunteerPledges(),
        apiGetAllRegisteredTeamHeads(),
      ]);
      setPledges(allPledges);
      setTeamHeads(heads);
    } catch (err) {
      console.warn("Could not load volunteer pledges:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  async function handleAssignPledge(pledgeId: string) {
    const targetTeamId = selectedTeamPerPledge[pledgeId];
    if (!targetTeamId) return;

    setAssigningId(pledgeId);
    try {
      const res = await apiAssignVolunteerPledgeToTeam(pledgeId, targetTeamId);
      setToastMsg(res.message);
      await loadData();
      setTimeout(() => setToastMsg(null), 5000);
    } catch (err) {
      console.error("Assignment error:", err);
      setToastMsg("Failed to assign volunteer pledge.");
      setTimeout(() => setToastMsg(null), 5000);
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <AdminShell>
      <div className="page-heading">
        <h1>Volunteer & Resource Pledges</h1>
        <div className="flex items-center gap-3">
          <span className="login-note">{pledges.length} total pledges</span>
          <button onClick={loadData} className="adm-btn">
            <RotateCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="p-4 bg-purple-900 text-white border border-purple-800 space-y-2 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Sparkles size={20} className="text-purple-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Centralized Volunteer Dispatch & Proximity Assignment
            </h3>
            <p className="text-xs text-purple-200 mt-0.5">
              Citizen pledges arrive directly at the District Command Center. Admin assigns each volunteer/equipment pledge to the <strong>closest regional Rescue Team Head</strong> based on geographical proximity.
            </p>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="adm-note mb-4 flex items-center gap-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border-emerald-300">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {loading && pledges.length === 0 ? (
        <div className="empty-state">
          <p>Loading volunteer pledges…</p>
        </div>
      ) : pledges.length === 0 ? (
        <div className="empty-state">
          <p>No volunteer pledges registered yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pledges.map((pledge) => {
            const isAssigned = pledge.status === "assigned_by_admin" || pledge.status === "approved_by_head";

            // Sort Rescue Team Heads by closest distance to this pledge's location
            const headsWithDist = teamHeads
              .map((head) => {
                const dist =
                  typeof pledge.lat === "number" &&
                  typeof pledge.lng === "number" &&
                  typeof head.officeLat === "number" &&
                  typeof head.officeLng === "number"
                    ? getDistanceKm(pledge.lat, pledge.lng, head.officeLat, head.officeLng)
                    : 999;
                return { ...head, dist };
              })
              .sort((a, b) => a.dist - b.dist);

            const closestHead = headsWithDist[0];
            const currentSelectedTeam =
              selectedTeamPerPledge[pledge.id] ||
              pledge.assignedTeamId ||
              (closestHead ? closestHead.teamId : "");

            return (
              <div
                key={pledge.id}
                className={`adm-card border-l-[4px] space-y-4 ${
                  isAssigned ? "border-l-emerald-600 bg-white" : "border-l-purple-600 bg-white"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-base font-bold text-slate-900">{pledge.volunteerName}</strong>
                      <span className="adm-status adm-status--mute font-mono text-[10px]">
                        {pledge.id}
                      </span>
                      <span
                        className={`adm-status ${
                          isAssigned ? "adm-status--green" : "adm-status--blue"
                        }`}
                      >
                        {isAssigned ? "✓ Assigned to Rescue Team" : "Pending Admin Assignment"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <MapPin size={13} className="text-[#115e59]" /> {pledge.locationName} ({pledge.region})
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 font-mono text-slate-600">
                        <Phone size={12} className="text-emerald-600" /> {pledge.contactPhone}
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Submitted: {new Date(pledge.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {/* Asset Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Pledged Asset / Skill:</span>
                    <strong className="text-slate-900 font-bold block mt-0.5">{pledge.assetType}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Capacity / Load:</span>
                    <strong className="text-slate-900 font-bold block mt-0.5">{pledge.capacity}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Availability:</span>
                    <strong className="text-emerald-700 font-bold block mt-0.5">{pledge.availability}</strong>
                  </div>
                </div>

                {/* Assignment Status or Proximity Selector */}
                {pledge.assignedTeamName ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <UserCheck size={16} className="text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold">Assigned Rescue Team:</span>{" "}
                        <span>{pledge.assignedTeamName}</span>
                      </div>
                    </div>
                    <span className="adm-status adm-status--green text-[10px]">Active Team Roster</span>
                  </div>
                ) : (
                  <div className="pt-1 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Crown size={14} className="text-amber-600" /> Assign to Rescue Team Head (Closest Proximity)
                      </span>
                      {closestHead && closestHead.dist !== 999 && (
                        <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                          Closest: {closestHead.headName} ({closestHead.dist} km)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={currentSelectedTeam}
                        onChange={(e) =>
                          setSelectedTeamPerPledge((prev) => ({
                            ...prev,
                            [pledge.id]: e.target.value,
                          }))
                        }
                        className="flex-1 min-w-[240px] p-2 bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:border-[#c2410c] focus:outline-hidden"
                      >
                        {headsWithDist.map((h) => (
                          <option key={h.teamId} value={h.teamId}>
                            {h.dist !== 999 ? `[${h.dist} km] ` : ""}
                            {h.headName} — {h.headOffice}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={!currentSelectedTeam || assigningId === pledge.id}
                        onClick={() => handleAssignPledge(pledge.id)}
                        className="adm-btn adm-btn--primary py-2 px-4 flex items-center gap-1.5 text-xs"
                      >
                        <Send size={13} />
                        {assigningId === pledge.id ? "Assigning..." : "Assign Volunteer to Team"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
