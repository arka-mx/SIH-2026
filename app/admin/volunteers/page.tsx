"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { apiGetAllIncidents, ReportItem } from "@/lib/api";
import { Sparkles, MapPin, Phone, Send, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function VolunteersPage() {
  const [pledges, setPledges] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadPledges() {
    try {
      setLoading(true);
      const allIncidents = await apiGetAllIncidents();
      // Filter reports that are community resource pledges
      const communityPledges = allIncidents.filter(
        (i) => i.description && i.description.includes("[COMMUNITY RESOURCE PLEDGE]")
      );
      setPledges(communityPledges);
    } catch (err) {
      console.warn("Could not load community resource pledges:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPledges();
  }, []);

  return (
    <AdminShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">People Network</p>
          <h1>Community Resource Pledges</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPledges}
            className="flex items-center gap-1 text-xs bg-white border border-stone-200 hover:border-emerald-500 px-3 py-1.5 rounded-lg shadow-2xs transition-all"
          >
            <RotateCw size={13} /> Refresh
          </button>
          <span className="login-note">{pledges.length} active pledges</span>
        </div>
      </div>

      <div className="p-4 bg-purple-900 text-white rounded-2xl mb-6 shadow-sm border border-purple-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30">
            <Sparkles size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              👑 Directly Managed by Regional Rescue Team Heads
            </h3>
            <p className="text-xs text-purple-200 mt-0.5">
              To eliminate administrative delays, incoming volunteer offers & equipment pledges route directly to the <strong>Rescue Team Head</strong> in each regional office command.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-stone-500 bg-white rounded-xl border border-stone-200">
          Loading community resource pledges...
        </div>
      ) : pledges.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-stone-200 text-stone-400 text-sm">
          No citizen resource pledges registered yet.
        </div>
      ) : (
        <div className="resource-grid">
          {pledges.map((pledge) => {
            // Extract info from formatted description
            const desc = pledge.description || "";
            const nameMatch = desc.match(/Pledged by:\s*([^\(]+)/);
            const contactMatch = desc.match(/\(([^)]+)\)/);
            const itemMatch = desc.match(/Item:\s*([^.]+)/);
            const availabilityMatch = desc.match(/Availability:\s*([^.]+)/);
            const locationMatch = desc.match(/Location:\s*(.+)$/);

            const name = nameMatch ? nameMatch[1].trim() : "Anonymous Citizen";
            const contact = contactMatch ? contactMatch[1].trim() : "No contact number";
            const item = itemMatch ? itemMatch[1].trim() : "General volunteer service";
            const availability = availabilityMatch ? availabilityMatch[1].trim() : "Flexible";
            const location = locationMatch ? locationMatch[1].trim() : "Mumbai Coastal Zone";

            return (
              <article className="resource-card !p-4 bg-white rounded-xl border border-stone-200 shadow-2xs" key={pledge.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm">{name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                      <MapPin size={13} /> {location}
                    </p>
                  </div>
                  <Badge tone={pledge.status === "resolved" ? "green" : "amber"}>
                    {pledge.status === "resolved" ? "Allocated" : "Awaiting Dispatch"}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-stone-600 sm:grid-cols-2">
                  <span>
                    <b className="block text-stone-900 capitalize">{item}</b>
                    Pledged Asset
                  </span>
                  <span>
                    <b className="block text-stone-900">{availability}</b>
                    Availability
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-stone-500 col-span-full mt-1">
                    <Phone size={12} /> {contact}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
