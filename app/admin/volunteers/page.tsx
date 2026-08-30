"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { apiGetAllIncidents, ReportItem } from "@/lib/api";
import { MapPin, Phone, RotateCw } from "lucide-react";
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
        <h1>Pledges</h1>
        <div className="flex items-center gap-3">
          <span className="login-note">{pledges.length} active</span>
          <button onClick={loadPledges} className="adm-btn">
            <RotateCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading…</p>
        </div>
      ) : pledges.length === 0 ? (
        <div className="empty-state">
          <p>No pledges yet.</p>
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

            const name = nameMatch ? nameMatch[1].trim() : "Anonymous";
            const contact = contactMatch ? contactMatch[1].trim() : "No contact";
            const item = itemMatch ? itemMatch[1].trim() : "Volunteer";
            const availability = availabilityMatch ? availabilityMatch[1].trim() : "Flexible";
            const location = locationMatch ? locationMatch[1].trim() : "—";

            return (
              <article className="resource-card" key={pledge.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={13} /> {location}
                    </p>
                  </div>
                  <Badge tone={pledge.status === "resolved" ? "green" : "amber"}>
                    {pledge.status === "resolved" ? "Allocated" : "Pending"}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <span>
                    <b className="block text-slate-900 capitalize">{item}</b>
                    Asset
                  </span>
                  <span>
                    <b className="block text-slate-900">{availability}</b>
                    Available
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500 col-span-full mt-1">
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
