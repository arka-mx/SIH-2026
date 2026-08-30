"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RescueHeadResourceEstimator } from "@/components/rescuer/RescueHeadResourceEstimator";
import { TeamHeadVolunteerPool } from "@/components/rescuer/TeamHeadVolunteerPool";
import { RescuerShell } from "@/components/rescuer/RescuerShell";
import { SupplyTracker } from "@/components/rescuer/SupplyTracker";
import { DisasterAssignmentCard } from "@/components/rescuer/DisasterAssignmentCard";
import { DistrictHeadConnection } from "@/components/rescuer/DistrictHeadConnection";
import { ReadOnlyDisasterMap } from "@/components/rescuer/ReadOnlyDisasterMap";
import { MemberResourceAllocationManager } from "@/components/rescuer/MemberResourceAllocationManager";
import { MemberFieldPortal } from "@/components/rescuer/MemberFieldPortal";
import {
  apiGetAllIncidents,
  apiGetIncidentsForOfficeRegion,
  apiGetRescuerUnitProfile,
  apiUpdateRescuerUnitProfile,
  emptyRescuerSupply,
  ReportItem,
} from "@/lib/api";
import { fetchRescuerSession, RescuerUserSession } from "@/lib/rescuerAuth";
import { RescuerSupply, RescuerUnitProfile } from "@/types/rescuer";
import { MapPin, Radio, Eye, PackagePlus } from "lucide-react";

const DEFAULT_REGION_RADIUS_KM = 35;

/** Build a working unit profile from the signed-in session when no stored profile exists. */
function profileFromSession(unitId: string, session: RescuerUserSession): RescuerUnitProfile {
  return {
    id: unitId,
    name: session.officeName ? `${session.officeName} · ${unitId}` : unitId,
    callsign: unitId.toUpperCase(),
    type: "rescue_team",
    leaderName: session.name || session.email || "",
    phone: "",
    status: "available",
    lat: session.officeLat || 0,
    lng: session.officeLng || 0,
    supplies: emptyRescuerSupply(),
  };
}

export default function RescuerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const rescuerId = resolvedParams.id;

  const [session, setSession] = useState<RescuerUserSession | null>(null);
  const sessionRef = useRef<RescuerUserSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [isTeamHead, setIsTeamHead] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const [profile, setProfile] = useState<RescuerUnitProfile | null>(null);
  const [incidents, setIncidents] = useState<ReportItem[]>([]);
  const [assignedIncident, setAssignedIncident] = useState<ReportItem | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const userSession = sessionRef.current;
      let data: ReportItem[];
      if (userSession && userSession.officeLat && userSession.officeLng) {
        data = await apiGetIncidentsForOfficeRegion(
          userSession.officeLat,
          userSession.officeLng,
          userSession.regionRadiusKm || DEFAULT_REGION_RADIUS_KM
        );
      } else {
        data = await apiGetAllIncidents();
      }
      setIncidents(data);

      const activeInc = data.find((i) => i.status === "verified" || i.status === "in_progress");
      setAssignedIncident(activeInc ?? null);
    } catch (err) {
      console.warn("Could not load incidents for rescuer dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await fetchRescuerSession();
      if (cancelled) return;

      if (!s) {
        router.replace("/rescuer/login");
        return;
      }

      sessionRef.current = s;
      setSession(s);
      setAuthChecked(true);
      setIsTeamHead(s.isTeamHead);
      setActiveTab(s.isTeamHead ? "overview" : "member-portal");

      const stored = await apiGetRescuerUnitProfile(rescuerId);
      if (cancelled) return;
      setProfile(stored ?? profileFromSession(rescuerId, s));

      await loadData();
    })();
    return () => {
      cancelled = true;
    };
  }, [rescuerId, router, loadData]);

  function handleStatusChange(newStatus: "available" | "en_route" | "at_scene") {
    setProfile((prev) => (prev ? { ...prev, status: newStatus } : prev));
  }

  function handleAssignmentChange(
    incident: ReportItem | null,
    source: "admin_dispatch" | "nearest_fallback"
  ) {
    setAssignedIncident(incident);
    setProfile((prev) =>
      prev ? { ...prev, assignedReportId: incident?.id, assignmentSource: source } : prev
    );
  }

  function handleUpdateSupplies(updated: RescuerSupply) {
    setProfile((prev) => (prev ? { ...prev, supplies: updated } : prev));
    void apiUpdateRescuerUnitProfile(rescuerId, { supplies: updated });
  }

  if (!authChecked || !session || !profile) {
    return (
      <div className="admin-shell">
        <main className="admin-main">
          <div className="adm-card text-center py-16 text-sm text-slate-500">
            Loading field command workspace…
          </div>
        </main>
      </div>
    );
  }

  const officeLat = session.officeLat || profile.lat;
  const officeLng = session.officeLng || profile.lng;
  const officeName = session.officeName || profile.name;
  const commanderName = profile.leaderName || session.name || session.email;
  const memberName = session.name || session.email || "Field Rescuer";

  return (
    <RescuerShell
      rescuerId={rescuerId}
      rescuerName={profile.name}
      status={profile.status}
      isTeamHead={isTeamHead}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* ── Top Header Strip ── */}
      <div className="adm-card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="adm-status adm-status--mute font-mono">{profile.callsign}</span>
              <span className={`adm-status ${isTeamHead ? "adm-status--amber" : "adm-status--green"}`}>
                {isTeamHead ? "Team Head" : "Field Member"}
              </span>
            </div>

            <h1 className="text-xl font-bold text-slate-900">{profile.name}</h1>

            <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <span>{commanderName}</span>
              {officeName && (
                <>
                  <span>·</span>
                  <span>{officeName}</span>
                </>
              )}
              {(officeLat || officeLng) && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1 font-mono">
                    <MapPin size={12} /> {officeLat.toFixed(4)}, {officeLng.toFixed(4)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ══ A. RESCUE TEAM HEAD VIEWS ══ */}
      {isTeamHead && (
        <>
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { tab: "district-head", icon: Radio, title: "District Head", desc: "Orders and messages from the district office." },
                  { tab: "disasters", icon: Eye, title: "Radar", desc: "Live citizen SOS incidents near your office." },
                  { tab: "allocate", icon: PackagePlus, title: "Allocate", desc: "Assign ration and resource quotas to members." },
                ].map(({ tab, icon: Icon, title, desc }) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className="adm-card adm-card--plain text-left hover:border-slate-400 transition-colors space-y-1.5 p-4"
                  >
                    <span className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <Icon size={15} className="text-(--a-accent)" /> {title}
                    </span>
                    <p className="text-[11px] text-slate-500">{desc}</p>
                  </button>
                ))}
              </div>

              <DisasterAssignmentCard
                rescuerId={rescuerId}
                rescuerType={profile.type}
                rescuerLat={profile.lat || officeLat}
                rescuerLng={profile.lng || officeLng}
                assignedIncident={assignedIncident}
                allIncidents={incidents}
                onAssignmentChange={handleAssignmentChange}
                onStatusChange={handleStatusChange}
              />

              <RescueHeadResourceEstimator
                assignedIncident={assignedIncident}
                rescuerId={rescuerId}
                leaderName={commanderName}
              />

              <TeamHeadVolunteerPool
                officeLat={officeLat}
                officeLng={officeLng}
                officeName={officeName}
                regionRadiusKm={session.regionRadiusKm || DEFAULT_REGION_RADIUS_KM}
                isTeamHead
              />

              <SupplyTracker
                initialSupplies={profile.supplies}
                onUpdateSupplies={handleUpdateSupplies}
              />
            </div>
          )}

          {activeTab === "disasters" && (
            <ReadOnlyDisasterMap
              incidents={incidents}
              userLat={officeLat}
              userLng={officeLng}
              officeName={officeName}
            />
          )}

          {activeTab === "district-head" && (
            <DistrictHeadConnection
              headUnitId={rescuerId}
              headName={commanderName}
              officeName={officeName}
            />
          )}

          {activeTab === "allocate" && (
            <MemberResourceAllocationManager
              teamId={rescuerId}
              teamName={profile.name}
              headName={commanderName}
              headPhone={profile.phone}
              headOffice={officeName}
            />
          )}

          {activeTab === "volunteers" && (
            <TeamHeadVolunteerPool
              officeLat={officeLat}
              officeLng={officeLng}
              officeName={officeName}
              regionRadiusKm={session.regionRadiusKm || DEFAULT_REGION_RADIUS_KM}
              isTeamHead
            />
          )}

          {activeTab === "supplies" && (
            <SupplyTracker
              initialSupplies={profile.supplies}
              onUpdateSupplies={handleUpdateSupplies}
            />
          )}
        </>
      )}

      {/* ══ B. RESCUE TEAM MEMBER VIEWS ══ */}
      {!isTeamHead && (
        <>
          {activeTab === "member-portal" && (
            <MemberFieldPortal
              teamId={rescuerId}
              teamName={profile.name}
              memberId={session.id}
              memberName={memberName}
              headName={commanderName}
              headPhone={profile.phone}
              headOffice={officeName}
            />
          )}

          {activeTab === "member-supplies" && (
            <div className="space-y-4">
              <div className="adm-card">
                <h2 className="text-base font-bold text-slate-900">Supplies</h2>
                <p className="text-xs text-slate-500">
                  Gear and loadout deployed with {profile.name}.
                </p>
              </div>
              <SupplyTracker
                initialSupplies={profile.supplies}
                onUpdateSupplies={handleUpdateSupplies}
              />
            </div>
          )}
        </>
      )}
    </RescuerShell>
  );
}
