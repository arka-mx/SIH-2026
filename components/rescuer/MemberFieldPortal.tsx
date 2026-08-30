"use client";

import { useEffect, useState } from "react";
import {
  HardHat,
  Crown,
  Phone,
  Radio,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Plus,
  PackageCheck,
  Utensils,
  Droplets,
  HeartPulse,
  LifeBuoy,
  Fuel,
  Sparkles,
  RotateCw,
  Building,
} from "lucide-react";
import {
  apiGetMemberAllocations,
  apiGetTeamHeadContact,
  apiUpdateMemberGatheredAmount,
  MemberOrderAllocation,
  ResourceRequirementItem,
  TeamHeadContactRecord,
} from "@/lib/api";

interface MemberFieldPortalProps {
  teamId: string;
  teamName?: string;
  memberId?: string;
  memberName?: string;
  headName?: string;
  headPhone?: string;
  headOffice?: string;
}

export function MemberFieldPortal({
  teamId,
  teamName,
  memberId,
  memberName = "Field Rescuer",
  headName = "your Rescue Team Head",
  headPhone,
  headOffice,
}: MemberFieldPortalProps) {
  const teamLabel = teamName || teamId;
  const [allocations, setAllocations] = useState<MemberOrderAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [headContact, setHeadContact] = useState<TeamHeadContactRecord>({
    teamId,
    headName,
    headPhone: headPhone || "",
    headOffice: headOffice || "",
    updatedAt: "",
  });

  useEffect(() => {
    async function loadHeadInfo() {
      try {
        const contact = await apiGetTeamHeadContact(teamId);
        if (contact && contact.headPhone) {
          setHeadContact(contact);
        }
      } catch (err) {
        console.warn("Could not load team head contact:", err);
      }
    }
    loadHeadInfo();
    const interval = setInterval(loadHeadInfo, 3000);
    return () => clearInterval(interval);
  }, [teamId]);

  async function loadAllocations() {
    try {
      setLoading(true);
      const data = await apiGetMemberAllocations(teamId);
      setAllocations(data);
    } catch (err) {
      console.warn("Could not load member allocations:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllocations();
    const interval = setInterval(loadAllocations, 4000);
    return () => clearInterval(interval);
  }, [teamId, memberId]);

  async function handleGather(allocationId: string, resourceKey: string, delta: number) {
    const actionKey = `${allocationId}-${resourceKey}`;
    setActionLoading(actionKey);
    try {
      const result = await apiUpdateMemberGatheredAmount(allocationId, resourceKey, delta);
      setAllocations((prev) =>
        prev.map((a) => (a.id === allocationId ? result.allocation : a))
      );
      setFeedbackMsg(result.message);
      setTimeout(() => setFeedbackMsg(null), 4500);
    } catch (err) {
      console.warn("Gather update error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  function getResourceIcon(key: string) {
    switch (key) {
      case "foodRationKits":
        return <Utensils size={15} className="text-amber-600" />;
      case "waterLiters":
        return <Droplets size={15} className="text-blue-600" />;
      case "medicalKits":
        return <HeartPulse size={15} className="text-rose-600" />;
      case "lifeJackets":
        return <LifeBuoy size={15} className="text-teal-600" />;
      case "fuelLiters":
        return <Fuel size={15} className="text-orange-600" />;
      default:
        return <PackageCheck size={15} className="text-slate-600" />;
    }
  }

  return (
    <div className="space-y-6">
      {/* Region Head Identity & Command Contact Banner */}
      <div className="adm-card border-l-[4px] border-l-[#115e59] space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="adm-status adm-status--blue flex items-center gap-1">
                <HardHat size={12} /> Normal Rescue Team Field Station
              </span>
              <span className="adm-status adm-status--green font-mono">
                {teamLabel}
              </span>
              <span className="adm-status adm-status--mute font-mono">
                Member: {memberName}
              </span>
            </div>

            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <HardHat size={22} className="text-[#115e59]" />
              Field Member Operational Station &amp; Resource Center
            </h1>

            <p className="text-xs text-slate-600">
              Welcome, <b>{memberName}</b>. Below are the operational directives and ration quotas issued to you by your <b>Rescue Team Head</b>.
            </p>
          </div>

          <button onClick={loadAllocations} className="adm-btn">
            <RotateCw size={13} /> Refresh Orders
          </button>
        </div>

        {/* Region Head & Hierarchy Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
          <div className="adm-kv">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <Crown size={14} className="text-amber-600" /> Regional Team Head
            </span>
            <strong className="text-slate-900 font-bold text-xs">{headContact.headName || headName}</strong>
          </div>

          <div className="adm-kv">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <Building size={14} className="text-[#115e59]" /> Regional Base Command
            </span>
            <strong className="text-slate-900 text-xs truncate">{headContact.headOffice || headOffice || "—"}</strong>
          </div>

          <div className="adm-kv">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <Phone size={14} className="text-emerald-600" /> Head Point of Contact
            </span>
            <strong className="text-emerald-700 font-mono text-xs">{headContact.headPhone || headPhone || "Not published"}</strong>
          </div>
        </div>
      </div>

      {/* Live Sync Notification Strip */}
      {feedbackMsg && (
        <div className="adm-note">
          <Sparkles size={16} className="text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold text-emerald-900 block">{feedbackMsg}</span>
            <span className="text-[11px] text-emerald-700">
              The Admin master database has been updated and capacity was automatically adjusted.
            </span>
          </div>
        </div>
      )}

      {/* Active Orders & Resource Requirements Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <span className="eyebrow">Assigned Directives</span>
            <h2 className="section-title mt-0.5">Orders Given by Rescue Team Head</h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {allocations.length} Active Directives
          </span>
        </div>

        {loading && allocations.length === 0 ? (
          <div className="adm-card text-center py-10 text-xs text-slate-400">
            Loading field directives from your Team Head…
          </div>
        ) : allocations.length === 0 ? (
          <div className="adm-card text-center py-10 text-xs text-slate-500">
            No active orders assigned by your Team Head at this moment. Standing by at base.
          </div>
        ) : (
          <div className="space-y-5">
            {allocations.map((order) => {
              const isCompleted = order.status === "completed";

              return (
                <div
                  key={order.id}
                  className={`adm-card border-l-[4px] space-y-4 ${
                    isCompleted ? "border-l-emerald-600 bg-white" : "border-l-amber-500 bg-white"
                  }`}
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between flex-wrap gap-2 pb-3 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="adm-status adm-status--mute font-mono text-[10px]">
                          {order.id}
                        </span>
                        <span
                          className={`adm-status ${
                            isCompleted ? "adm-status--green" : "adm-status--amber"
                          }`}
                        >
                          {isCompleted ? "✓ Requirement Completed" : "⏳ Gathering in Progress"}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-slate-900 mt-1">
                        {order.title}
                      </h3>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">
                        Assigned by <b className="text-slate-800">{order.headName}</b>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(order.assignedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {/* Instructions Box */}
                  <div className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                      Direct Instructions from Team Head:
                    </span>
                    {order.instructions}
                  </div>

                  {/* Resource Requirements & Interactive Gathering Inputs */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="eyebrow flex items-center gap-1.5">
                        <PackageCheck size={13} /> Required Resource Gathering Quotas
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Log as you gather from supply stock
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {order.resources.map((res) => {
                        const isDone = res.gatheredAmount >= res.targetAmount;
                        const pct = Math.round((res.gatheredAmount / (res.targetAmount || 1)) * 100);
                        const loadingKey = `${order.id}-${res.key}`;
                        const isGatheringThis = actionLoading === loadingKey;

                        return (
                          <div
                            key={res.key}
                            className={`p-3.5 border space-y-2.5 transition-colors ${
                              isDone
                                ? "border-emerald-300 bg-emerald-50/50"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getResourceIcon(res.key)}
                                <span className="font-bold text-xs text-slate-900">
                                  {res.name}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-none border font-mono ${
                                  isDone
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : "bg-slate-100 text-slate-700 border-slate-300"
                                }`}
                              >
                                {res.gatheredAmount} / {res.targetAmount} {res.unit}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="adm-meter">
                              <span
                                style={{ width: `${Math.min(100, pct)}%` }}
                                className={isDone ? "bg-emerald-600" : "bg-[#115e59]"}
                              />
                            </div>

                            {/* Action Buttons to Update Completion */}
                            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                              <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                Admin Pool: {res.adminResourceName}
                              </span>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={isDone || isGatheringThis}
                                  onClick={() => handleGather(order.id, res.key, 1)}
                                  className="adm-btn text-[10px] py-1 px-2.5"
                                  title="Log +1 unit gathered (auto-deducts from Admin)"
                                >
                                  <Plus size={11} /> 1
                                </button>
                                <button
                                  type="button"
                                  disabled={isDone || isGatheringThis}
                                  onClick={() => handleGather(order.id, res.key, 5)}
                                  className="adm-btn adm-btn--primary text-[10px] py-1 px-2.5"
                                  title="Log +5 units gathered (auto-deducts from Admin)"
                                >
                                  <Plus size={11} /> 5
                                </button>
                                <button
                                  type="button"
                                  disabled={isDone || isGatheringThis}
                                  onClick={() => handleGather(order.id, res.key, 10)}
                                  className="adm-btn adm-btn--primary text-[10px] py-1 px-2.5"
                                  title="Log +10 units gathered (auto-deducts from Admin)"
                                >
                                  <Plus size={11} /> 10
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
