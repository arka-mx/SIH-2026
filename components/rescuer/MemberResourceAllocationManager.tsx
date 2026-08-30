"use client";

import { useEffect, useState } from "react";
import {
  PackagePlus,
  Users,
  Utensils,
  Droplets,
  HeartPulse,
  LifeBuoy,
  Fuel,
  CheckCircle2,
  Clock,
  Send,
  UserCheck,
  ChevronRight,
  Shield,
  Layers,
} from "lucide-react";
import {
  apiGetTeamMembers,
  apiGetMemberAllocations,
  apiCreateMemberAllocation,
  TeamMember,
  MemberOrderAllocation,
  ResourceRequirementItem,
} from "@/lib/api";

interface MemberResourceAllocationManagerProps {
  teamId: string;
  teamName?: string;
  headName: string;
  headPhone?: string;
  headOffice: string;
}

export function MemberResourceAllocationManager({
  teamId,
  teamName,
  headName,
  headPhone,
  headOffice,
}: MemberResourceAllocationManagerProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [allocations, setAllocations] = useState<MemberOrderAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Creation Form State
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [orderTitle, setOrderTitle] = useState("");
  const [instructions, setInstructions] = useState("");

  // Resource Quota inputs
  const [foodKits, setFoodKits] = useState(30);
  const [waterLiters, setWaterLiters] = useState(120);
  const [medicalKits, setMedicalKits] = useState(6);
  const [lifeJackets, setLifeJackets] = useState(10);
  const [fuelLiters, setFuelLiters] = useState(40);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const [membersData, allocsData] = await Promise.all([
        apiGetTeamMembers(teamId),
        apiGetMemberAllocations(teamId),
      ]);
      setMembers(membersData);
      setAllocations(allocsData);
      if (membersData.length > 0 && !selectedMemberId) {
        setSelectedMemberId(membersData[0].id);
      }
    } catch (err) {
      console.warn("Could not load member allocations:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [teamId]);

  async function handleCreateAllocation(e: React.FormEvent) {
    e.preventDefault();
    const targetMember = members.find((m) => m.id === selectedMemberId);
    if (!targetMember) return;

    setActionLoading(true);
    try {
      const resourcesList: ResourceRequirementItem[] = [];
      if (foodKits > 0) {
        resourcesList.push({
          key: "foodRationKits",
          name: "Food Ration Kits",
          targetAmount: foodKits,
          gatheredAmount: 0,
          unit: "packs",
          adminResourceName: "District Central Food Ration Stock",
        });
      }
      if (waterLiters > 0) {
        resourcesList.push({
          key: "waterLiters",
          name: "Drinking Water",
          targetAmount: waterLiters,
          gatheredAmount: 0,
          unit: "liters",
          adminResourceName: "Regional Potable Drinking Water Depot",
        });
      }
      if (medicalKits > 0) {
        resourcesList.push({
          key: "medicalKits",
          name: "Medical & Triage Kits",
          targetAmount: medicalKits,
          gatheredAmount: 0,
          unit: "kits",
          adminResourceName: "District Hospital Emergency Medical Packs",
        });
      }
      if (lifeJackets > 0) {
        resourcesList.push({
          key: "lifeJackets",
          name: "Life Vests",
          targetAmount: lifeJackets,
          gatheredAmount: 0,
          unit: "vests",
          adminResourceName: "Civil Defense Life Jackets & Inflatable Boats Hub",
        });
      }
      if (fuelLiters > 0) {
        resourcesList.push({
          key: "fuelLiters",
          name: "Emergency Fuel",
          targetAmount: fuelLiters,
          gatheredAmount: 0,
          unit: "liters",
          adminResourceName: "Emergency Operations Diesel & Fuel Stock",
        });
      }

      await apiCreateMemberAllocation({
        teamId,
        teamName: teamName || teamId,
        headName,
        headPhone: headPhone || "",
        headOffice,
        memberId: targetMember.id,
        memberName: targetMember.name,
        memberRole: targetMember.role,
        title: orderTitle || `Emergency Supply Gathering Directive for ${targetMember.name}`,
        instructions: instructions || "Gather assigned rations and report deployment status upon completion.",
        resources: resourcesList,
      });

      setOrderTitle("");
      setInstructions("");
      setActionSuccess(`New allocation & operational order successfully assigned to ${targetMember.name}!`);
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.warn("Could not assign allocation:", err);
    } finally {
      setActionLoading(false);
    }
  }

  // Calculate totals
  const totalAllocatedKits = allocations.reduce(
    (sum, a) => sum + (a.resources.find((r) => r.key === "foodRationKits")?.targetAmount || 0),
    0
  );
  const totalGatheredKits = allocations.reduce(
    (sum, a) => sum + (a.resources.find((r) => r.key === "foodRationKits")?.gatheredAmount || 0),
    0
  );
  const totalAllocatedWater = allocations.reduce(
    (sum, a) => sum + (a.resources.find((r) => r.key === "waterLiters")?.targetAmount || 0),
    0
  );
  const totalGatheredWater = allocations.reduce(
    (sum, a) => sum + (a.resources.find((r) => r.key === "waterLiters")?.gatheredAmount || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="adm-card border-l-[4px] border-l-[#115e59] space-y-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="adm-status adm-status--blue flex items-center gap-1">
                <PackagePlus size={12} /> Team Commander Allocation Hub
              </span>
              <span className="adm-status adm-status--green font-mono">
                {allocations.length} Active Orders
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Member Ration &amp; Resource Allocation Center
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl">
              As <b>Rescue Team Head</b>, assign rations, supplies, and operational requirements to your team members.
              When members gather resources in the field and log progress, amounts are <b>automatically deducted</b> from the District Admin master stock in real time.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] uppercase font-bold text-slate-500 block">Unit Commander</span>
            <strong className="text-xs font-bold text-slate-900 block">{headName}</strong>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="adm-note">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span className="font-semibold text-emerald-900">{actionSuccess}</span>
        </div>
      )}

      {/* Aggregate Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="adm-tile space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <Utensils size={12} /> Food Ration Quotas
          </span>
          <div className="flex items-baseline justify-between">
            <span className="adm-tile__num">{totalGatheredKits} / {totalAllocatedKits}</span>
            <span className="text-xs text-slate-500 font-mono">packs</span>
          </div>
          <div className="adm-meter">
            <span style={{ width: `${Math.min(100, Math.round((totalGatheredKits / (totalAllocatedKits || 1)) * 100))}%` }} />
          </div>
        </div>

        <div className="adm-tile space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <Droplets size={12} /> Drinking Water Quotas
          </span>
          <div className="flex items-baseline justify-between">
            <span className="adm-tile__num">{totalGatheredWater} / {totalAllocatedWater}</span>
            <span className="text-xs text-slate-500 font-mono">liters</span>
          </div>
          <div className="adm-meter">
            <span style={{ width: `${Math.min(100, Math.round((totalGatheredWater / (totalAllocatedWater || 1)) * 100))}%` }} />
          </div>
        </div>

        <div className="adm-tile space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <Users size={12} /> Deployed Rescuers
          </span>
          <div className="flex items-baseline justify-between">
            <span className="adm-tile__num">{members.length}</span>
            <span className="text-xs text-slate-500 font-mono">officers</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block pt-1">
            {members.filter((m) => m.status === "active" || m.status === "field_dispatched").length} field ready
          </span>
        </div>

        <div className="adm-tile space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
            <CheckCircle2 size={12} /> Fulfillment Rate
          </span>
          <div className="flex items-baseline justify-between">
            <span className="adm-tile__num">
              {allocations.length > 0
                ? Math.round(
                    (allocations.filter((a) => a.status === "completed").length / allocations.length) * 100
                  )
                : 0}
              %
            </span>
            <span className="text-xs text-slate-500 font-mono">done</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono block pt-1">
            {allocations.filter((a) => a.status === "completed").length} of {allocations.length} completed
          </span>
        </div>
      </div>

      {/* Main Grid: Create Allocation & Active Member Directives List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Create New Allocation Form (5 cols) */}
        <div className="lg:col-span-5">
          <div className="adm-card space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <PackagePlus size={16} className="text-[#115e59]" />
              <h3 className="font-bold text-sm text-slate-900">
                Issue Orders &amp; Allocate Rations to Member
              </h3>
            </div>

            <form onSubmit={handleCreateAllocation} className="space-y-4">
              {/* Member Selection */}
              <label className="adm-field">
                <span>Select Target Team Member</span>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  required
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.role} ({m.callsign})
                    </option>
                  ))}
                </select>
              </label>

              {/* Order Title */}
              <label className="adm-field">
                <span>Mission / Order Title</span>
                <input
                  type="text"
                  required
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  placeholder="e.g. Sector 2 Flood Relief Distribution"
                />
              </label>

              {/* Operational Instructions */}
              <label className="adm-field">
                <span>Instructions from Team Head</span>
                <textarea
                  rows={2}
                  required
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Specific tasks, target shelter locations, or distribution guidelines…"
                  className="w-full p-2.5 bg-white border border-[#cbd5e1] text-xs font-semibold text-slate-900 focus:border-[#115e59] focus:outline-hidden"
                />
              </label>

              {/* Resource Quantities to Allocate */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="eyebrow block">Resource &amp; Ration Quotas to Assign</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="adm-field">
                    <span><Utensils size={11} /> Food Kits (packs)</span>
                    <input
                      type="number"
                      min="0"
                      value={foodKits}
                      onChange={(e) => setFoodKits(parseInt(e.target.value) || 0)}
                    />
                  </label>

                  <label className="adm-field">
                    <span><Droplets size={11} /> Clean Water (L)</span>
                    <input
                      type="number"
                      min="0"
                      value={waterLiters}
                      onChange={(e) => setWaterLiters(parseInt(e.target.value) || 0)}
                    />
                  </label>

                  <label className="adm-field">
                    <span><HeartPulse size={11} /> Medical Kits</span>
                    <input
                      type="number"
                      min="0"
                      value={medicalKits}
                      onChange={(e) => setMedicalKits(parseInt(e.target.value) || 0)}
                    />
                  </label>

                  <label className="adm-field">
                    <span><LifeBuoy size={11} /> Life Vests</span>
                    <input
                      type="number"
                      min="0"
                      value={lifeJackets}
                      onChange={(e) => setLifeJackets(parseInt(e.target.value) || 0)}
                    />
                  </label>
                </div>

                <label className="adm-field">
                  <span><Fuel size={11} /> Emergency Vehicle/Boat Fuel (Liters)</span>
                  <input
                    type="number"
                    min="0"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(parseInt(e.target.value) || 0)}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="adm-btn adm-btn--primary w-full justify-center"
              >
                <Send size={14} />
                {actionLoading ? "Dispatching Allocation…" : "Dispatch Allocation & Order to Member"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Active Member Allocations Stream (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="eyebrow">Active Member Allocations &amp; Live Fulfillment</span>
            <span className="text-xs font-mono text-slate-500">{allocations.length} Directives</span>
          </div>

          {loading && allocations.length === 0 ? (
            <div className="adm-card text-center py-8 text-xs text-slate-400">
              Loading allocated member orders…
            </div>
          ) : allocations.length === 0 ? (
            <div className="adm-card text-center py-8 text-xs text-slate-500">
              No orders have been dispatched to team members yet. Use the form on the left to allocate rations.
            </div>
          ) : (
            <div className="space-y-3">
              {allocations.map((alloc) => {
                const isComplete = alloc.status === "completed";

                return (
                  <div
                    key={alloc.id}
                    className="adm-card border border-slate-200 p-4 space-y-3 bg-white"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="adm-status adm-status--mute font-mono text-[10px]">
                            {alloc.id}
                          </span>
                          <span
                            className={`adm-status ${
                              isComplete ? "adm-status--green" : "adm-status--amber"
                            }`}
                          >
                            {isComplete ? "Fulfillment Complete" : "Gathering in Progress"}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 mt-1">
                          {alloc.title}
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 block flex items-center gap-1 justify-end">
                          <UserCheck size={13} className="text-[#115e59]" /> {alloc.memberName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {alloc.memberRole}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 p-2.5 leading-relaxed">
                      <strong>Head Instructions:</strong> {alloc.instructions}
                    </p>

                    {/* Resources Progress Meters */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">
                        Assigned Resource Gathering Progress:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {alloc.resources.map((res) => {
                          const pct = Math.round(
                            (res.gatheredAmount / (res.targetAmount || 1)) * 100
                          );
                          const isDone = res.gatheredAmount >= res.targetAmount;

                          return (
                            <div
                              key={res.key}
                              className={`p-2.5 border ${
                                isDone ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white"
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-bold text-slate-800">{res.name}</span>
                                <span className="font-mono font-bold text-slate-700">
                                  {res.gatheredAmount} / {res.targetAmount} {res.unit} ({pct}%)
                                </span>
                              </div>
                              <div className="adm-meter">
                                <span
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                  className={isDone ? "bg-emerald-600" : "bg-[#115e59]"}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      <span>Assigned by {alloc.headName}</span>
                      <span>Updated {new Date(alloc.updatedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
