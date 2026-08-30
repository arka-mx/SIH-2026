"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Radio,
  CheckCircle2,
  Building2,
  Clock,
  CheckCheck,
  Award,
  MessageSquare,
  Send,
} from "lucide-react";
import {
  apiGetDistrictHeadDirectives,
  apiAcknowledgeDistrictHeadDirective,
  apiSendDistrictHeadDirective,
  DistrictHeadDirective,
} from "@/lib/api";

interface DistrictHeadConnectionProps {
  headUnitId: string;
  headName: string;
  officeName: string;
}

export function DistrictHeadConnection({
  headUnitId,
  headName,
  officeName,
}: DistrictHeadConnectionProps) {
  const [directives, setDirectives] = useState<DistrictHeadDirective[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "order" | "notification" | "critical">("all");
  const [selectedDirective, setSelectedDirective] = useState<DistrictHeadDirective | null>(null);
  const [ackNote, setAckNote] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  async function loadDirectives() {
    try {
      setLoading(true);
      const data = await apiGetDistrictHeadDirectives(headUnitId);
      setDirectives(data);
      if (data.length > 0 && !selectedDirective) {
        setSelectedDirective(data[0]);
      }
    } catch (err) {
      console.warn("Could not load district directives:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDirectives();
    const interval = setInterval(loadDirectives, 5000);
    return () => clearInterval(interval);
  }, [headUnitId]);

  async function handleAcknowledge(directiveId: string) {
    setActionLoading(true);
    try {
      const updated = await apiAcknowledgeDistrictHeadDirective(directiveId, ackNote);
      setDirectives((prev) => prev.map((d) => (d.id === directiveId ? updated : d)));
      setSelectedDirective(updated);
      setAckNote("");
      setActionSuccess("Acknowledged. Confirmation sent to the district office.");
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err) {
      console.warn("Could not acknowledge directive:", err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSendReplyToAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setActionLoading(true);
    try {
      await apiSendDistrictHeadDirective({
        adminName: "District Disaster Authority (Admin Head)",
        headUnitId,
        title: `Tactical Field Update from ${headName}`,
        message: replyMessage.trim(),
        type: "message",
        priority: "high",
      });
      setReplyMessage("");
      setActionSuccess("Message sent to the district head.");
      await loadDirectives();
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err) {
      console.warn("Could not send reply:", err);
    } finally {
      setActionLoading(false);
    }
  }

  const filteredDirectives = directives.filter((d) => {
    if (filter === "order") return d.type === "order" || d.type === "priority_dispatch";
    if (filter === "notification") return d.type === "notification" || d.type === "message";
    if (filter === "critical") return d.priority === "critical";
    return true;
  });

  const unackCount = directives.filter((d) => !d.acknowledged).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="adm-card space-y-2">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="adm-status adm-status--blue">Direct link</span>
              {unackCount > 0 && (
                <span className="adm-status adm-status--red">{unackCount} to acknowledge</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Radio size={18} className="text-(--a-accent)" />
              District Head
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl">
              Orders and messages between the district office and {headName}. Acknowledge each order to confirm readiness.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Office</span>
            <strong className="text-xs font-bold text-slate-900 block">{officeName}</strong>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="adm-note">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span className="font-semibold text-emerald-900">{actionSuccess}</span>
        </div>
      )}

      {/* Main Grid: Directives List & Directive Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Directives Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-200">
            <span className="eyebrow">Orders</span>
            <div className="adm-segment">
              <button
                type="button"
                data-active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                All ({directives.length})
              </button>
              <button
                type="button"
                data-active={filter === "order"}
                onClick={() => setFilter("order")}
              >
                Orders
              </button>
              <button
                type="button"
                data-active={filter === "critical"}
                onClick={() => setFilter("critical")}
              >
                Critical
              </button>
            </div>
          </div>

          {loading && directives.length === 0 ? (
            <div className="adm-card text-center py-8 text-xs text-slate-400">
              Loading…
            </div>
          ) : filteredDirectives.length === 0 ? (
            <div className="adm-card text-center py-8 text-xs text-slate-500">
              None
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredDirectives.map((item) => {
                const isSelected = selectedDirective?.id === item.id;
                const isCritical = item.priority === "critical";

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedDirective(item)}
                    className={`p-3.5 border cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#b45309] bg-amber-50/40 shadow-xs ring-1 ring-[#b45309]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {item.id}
                      </span>
                      <div className="flex items-center gap-1">
                        {isCritical && (
                          <span className="adm-status adm-status--red">Critical</span>
                        )}
                        {item.acknowledged ? (
                          <span className="adm-status adm-status--green flex items-center gap-0.5">
                            <CheckCheck size={10} /> Ack
                          </span>
                        ) : (
                          <span className="adm-status adm-status--amber flex items-center gap-0.5">
                            <Clock size={10} /> Pending
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 mt-1 line-clamp-1">
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      <span className="truncate max-w-[180px]">{item.adminName}</span>
                      <span>{new Date(item.issuedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Directive Inspector & Acknowledgment / Reply (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {selectedDirective ? (
            <div className="adm-card space-y-5">
              <div className="flex items-start justify-between flex-wrap gap-2 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="adm-status adm-status--mute font-mono">{selectedDirective.id}</span>
                    <span className={`adm-status ${selectedDirective.priority === "critical" ? "adm-status--red" : "adm-status--blue"}`}>
                      {selectedDirective.type.replace("_", " ")}
                    </span>
                    {selectedDirective.acknowledged ? (
                      <span className="adm-status adm-status--green flex items-center gap-1">
                        <CheckCheck size={11} /> Acknowledged
                      </span>
                    ) : (
                      <span className="adm-status adm-status--amber flex items-center gap-1">
                        <Clock size={11} /> Pending
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-2">
                    {selectedDirective.title}
                  </h2>
                </div>

                <span className="text-xs text-slate-500 font-mono">
                  {new Date(selectedDirective.issuedAt).toLocaleString()}
                </span>
              </div>

              {/* Source & Authority Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="adm-kv">
                  <span className="flex items-center gap-1.5"><Building2 size={13} className="text-slate-400" /> From</span>
                  <strong className="text-xs text-slate-900 truncate">{selectedDirective.adminName}</strong>
                </div>
                <div className="adm-kv">
                  <span className="flex items-center gap-1.5"><Award size={13} className="text-slate-400" /> To</span>
                  <strong className="text-xs text-slate-900 truncate">{headName}</strong>
                </div>
              </div>

              {/* Message Payload */}
              <div className="p-4 bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">
                  Instructions
                </span>
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                  {selectedDirective.message}
                </p>
              </div>

              {/* Attached Resource Requirement Target */}
              {selectedDirective.attachedResourceTarget && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-300 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-900 tracking-wider flex items-center gap-1">
                    <ShieldAlert size={13} /> Resource target
                  </span>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs font-semibold text-amber-950">
                      {selectedDirective.attachedResourceTarget.type}
                    </span>
                    <strong className="font-mono text-sm font-bold text-amber-950">
                      {selectedDirective.attachedResourceTarget.amount} {selectedDirective.attachedResourceTarget.unit}
                    </strong>
                  </div>
                </div>
              )}

              {/* Acknowledgment Section */}
              {selectedDirective.acknowledged ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <CheckCheck size={14} className="text-emerald-700" /> Acknowledged
                    </span>
                    <span className="text-[10px] text-emerald-700 font-mono">
                      {selectedDirective.acknowledgedAt ? new Date(selectedDirective.acknowledgedAt).toLocaleTimeString() : ""}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-1 italic">
                    &ldquo;{selectedDirective.acknowledgmentNote || "Received."}&rdquo;
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-white border border-slate-200 space-y-3">
                  <span className="eyebrow block">Response</span>
                  <input
                    type="text"
                    value={ackNote}
                    onChange={(e) => setAckNote(e.target.value)}
                    placeholder="Add a status note (optional)…"
                    className="w-full p-2.5 bg-white border border-[#cbd5e1] text-xs font-semibold text-slate-900 focus:border-[#b45309] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleAcknowledge(selectedDirective.id)}
                    disabled={actionLoading}
                    className="adm-btn adm-btn--primary w-full justify-center"
                  >
                    <CheckCheck size={14} />
                    {actionLoading ? "Sending…" : "Acknowledge"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="adm-card text-center py-12 text-xs text-slate-500">
              Select an order to view it.
            </div>
          )}

          {/* Message to District Head */}
          <div className="adm-card space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <MessageSquare size={16} className="text-(--a-accent)" />
              <span className="font-bold text-xs text-slate-900">Message the district head</span>
            </div>
            <form onSubmit={handleSendReplyToAdmin} className="space-y-3">
              <textarea
                rows={3}
                required
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Field update, resource request, or incident briefing…"
                className="w-full p-2.5 bg-white border border-[#cbd5e1] text-xs font-semibold text-slate-900 focus:border-[#b45309] focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={actionLoading || !replyMessage.trim()}
                className="adm-btn adm-btn--primary justify-center"
              >
                <Send size={13} /> Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
