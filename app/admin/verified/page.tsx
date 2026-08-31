"use client";

import { useEffect, useState, Suspense } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { IncidentList } from "@/components/incidents/IncidentList";
import {
  apiGetAllIncidents,
  apiGetAllVolunteerPledges,
  ReportItem,
  VolunteerPledge,
} from "@/lib/api";
import { useRealtimeIncidents } from "@/lib/socket";
import { RotateCw, ShieldCheck, HandHeart, Phone, MapPin, Crown, Building } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function VerifiedPageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "pledges" ? "pledges" : "incidents";
  const [activeTab, setActiveTab] = useState<"incidents" | "pledges">(initialTab);

  const { incidents, setIncidents } = useRealtimeIncidents([]);
  const [pledges, setPledges] = useState<VolunteerPledge[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      const [incData, pledgeData] = await Promise.all([
        apiGetAllIncidents(),
        apiGetAllVolunteerPledges(),
      ]);
      setIncidents(incData);
      setPledges(pledgeData);
    } catch (err) {
      console.warn("Could not load verified records:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const verifiedAndInProgress = incidents.filter(
    (i) => i.status === "verified" || i.status === "in_progress"
  );

  const assignedPledges = pledges.filter(
    (p) => p.status === "assigned_by_admin" || p.status === "approved_by_head" || p.status === "mobilized"
  );

  return (
    <AdminShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" /> Confirmed &amp; Dispatched Queue
          </p>
          <h1>Verified Command Records</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="adm-btn">
            <RotateCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs Selector: 2 Sections */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("incidents")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "incidents"
              ? "border-[#115e59] text-[#115e59]"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <ShieldCheck size={15} />
          Verified Incidents
          <span className="adm-status adm-status--green text-[10px]">
            {verifiedAndInProgress.length} Cases
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pledges")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "pledges"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <HandHeart size={15} />
          Verified &amp; Assigned Pledges
          <span className="adm-status text-[10px] bg-purple-100 text-purple-800 border-purple-300">
            {assignedPledges.length} Pledges
          </span>
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading records…</p>
        </div>
      ) : activeTab === "incidents" ? (
        verifiedAndInProgress.length === 0 ? (
          <div className="empty-state">
            <p>No verified incidents at this moment.</p>
          </div>
        ) : (
          <IncidentList incidents={verifiedAndInProgress} onUpdate={loadData} />
        )
      ) : (
        /* Verified Pledges Tab Content */
        assignedPledges.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 space-y-2">
            <p className="font-bold text-slate-800 text-sm">No assigned pledges in record yet.</p>
            <p className="text-xs text-slate-500">
              When an Admin assigns a community volunteer pledge to a Rescue Team Head, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignedPledges.map((pledge) => (
              <div
                key={pledge.id}
                className="p-5 border border-purple-200 bg-white space-y-3 shadow-xs hover:border-purple-400 transition-colors"
              >
                <div className="flex items-start justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-900">
                        {pledge.volunteerName}
                      </span>
                      <span className="adm-status font-mono text-[10px] bg-purple-100 text-purple-800 border-purple-300">
                        {pledge.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-600 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin size={13} className="text-purple-600 shrink-0" />
                        {pledge.locationName} ({pledge.region})
                      </span>
                      <a
                        href={`tel:${pledge.contactPhone}`}
                        className="flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                      >
                        <Phone size={13} className="shrink-0" />
                        {pledge.contactPhone}
                      </a>
                    </div>
                  </div>

                  <span
                    className={`adm-status text-[11px] font-bold ${
                      pledge.status === "mobilized"
                        ? "adm-status--green"
                        : pledge.status === "approved_by_head"
                        ? "adm-status--blue"
                        : "adm-status--amber"
                    }`}
                  >
                    {pledge.status === "mobilized"
                      ? "⚡ Mobilized to Scene"
                      : pledge.status === "approved_by_head"
                      ? "✓ Approved by Team Head"
                      : "👑 Assigned by Admin Head"}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Pledged Asset / Skill
                    </span>
                    <strong className="text-purple-900 font-bold text-sm">
                      {pledge.assetType}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Capacity / Load
                    </span>
                    <strong className="text-slate-800 font-bold">{pledge.capacity}</strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Availability Timeline
                    </span>
                    <strong className="text-slate-800 font-bold">{pledge.availability}</strong>
                  </div>
                </div>

                {/* Assigned Team Head Banner */}
                {pledge.assignedTeamName && (
                  <div className="p-3 bg-purple-50 border border-purple-200 text-xs flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Crown size={15} className="text-amber-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-purple-700 uppercase font-bold tracking-wider block">
                          Assigned Rescue Team Base
                        </span>
                        <span className="font-bold text-slate-900">
                          {pledge.assignedTeamName}
                        </span>
                      </div>
                    </div>

                    <a
                      href={`tel:${pledge.contactPhone}`}
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded font-bold text-xs flex items-center gap-1.5"
                    >
                      <Phone size={13} /> Direct Call Volunteer
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </AdminShell>
  );
}

export default function VerifiedPage() {
  return (
    <Suspense fallback={
      <AdminShell>
        <div className="empty-state"><p>Loading verified records…</p></div>
      </AdminShell>
    }>
      <VerifiedPageContent />
    </Suspense>
  );
}
