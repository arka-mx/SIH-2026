"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RescueHeadResourceEstimator } from "@/components/rescuer/RescueHeadResourceEstimator";
import { TeamHeadVolunteerPool } from "@/components/rescuer/TeamHeadVolunteerPool";
import { RescuerShell } from "@/components/rescuer/RescuerShell";
import { SupplyTracker } from "@/components/rescuer/SupplyTracker";
import { DisasterAssignmentCard } from "@/components/rescuer/DisasterAssignmentCard";
import { DistrictHeadConnection } from "@/components/rescuer/DistrictHeadConnection";
import { ReadOnlyDisasterMap } from "@/components/rescuer/ReadOnlyDisasterMap";
import { MemberResourceAllocationManager } from "@/components/rescuer/MemberResourceAllocationManager";
import { MemberFieldPortal } from "@/components/rescuer/MemberFieldPortal";
import { apiGetAllIncidents, apiGetIncidentsForOfficeRegion, ReportItem } from "@/lib/api";
import { fetchRescuerSession, RescuerUserSession } from "@/lib/rescuerAuth";
import { RescuerSupply, RescuerUnitProfile } from "@/types/rescuer";
import { RotateCw, MapPin, LogIn, Radio, Eye, PackagePlus } from "lucide-react";

// Mock Rescuer Database mapping
const INITIAL_RESCUER_PROFILES: Record<string, RescuerUnitProfile> = {
  "demo-team-alpha": {
    id: "demo-team-alpha",
    name: "NDRF Team Alpha",
    callsign: "RESCUE-ALPHA-01",
    type: "rescue_team",
    leaderName: "Captain Rajesh Verma",
    phone: "+91 98765 11001",
    status: "available",
    lat: 19.3150,
    lng: 84.7940,
    supplies: {
      foodRationKits: 120,
      foodRationCapacity: 200,
      waterLiters: 450,
      waterCapacityLiters: 800,
      medicalKits: 18,
      medicalKitsCapacity: 30,
      ivFluidsCount: 45,
      shelterBedsAvailable: 85,
      shelterBedsTotal: 250,
      lifeJackets: 40,
      fuelLiters: 110,
      satPhoneBatteryPct: 92,
    },
  },
  "res-boat-01": {
    id: "res-boat-01",
    name: "Inflatable Boat Squad IR-1",
    callsign: "BOAT-DELTA-03",
    type: "boat",
    leaderName: "Inspector Sunil Naik",
    phone: "+91 98765 11002",
    status: "available",
    lat: 19.0680,
    lng: 72.8650,
    supplies: {
      foodRationKits: 40,
      foodRationCapacity: 80,
      waterLiters: 150,
      waterCapacityLiters: 300,
      medicalKits: 8,
      medicalKitsCapacity: 15,
      ivFluidsCount: 15,
      shelterBedsAvailable: 0,
      shelterBedsTotal: 0,
      lifeJackets: 60,
      fuelLiters: 75,
      satPhoneBatteryPct: 88,
    },
  },
  "res-amb-102": {
    id: "res-amb-102",
    name: "City Hospital Rapid Ambulance AMB-102",
    callsign: "MED-UNIT-102",
    type: "ambulance",
    leaderName: "Dr. Ananya Sen",
    phone: "+91 98765 11003",
    status: "available",
    lat: 19.0820,
    lng: 72.8900,
    supplies: {
      foodRationKits: 20,
      foodRationCapacity: 30,
      waterLiters: 80,
      waterCapacityLiters: 150,
      medicalKits: 25,
      medicalKitsCapacity: 40,
      ivFluidsCount: 80,
      shelterBedsAvailable: 0,
      shelterBedsTotal: 0,
      lifeJackets: 5,
      fuelLiters: 90,
      satPhoneBatteryPct: 95,
    },
  },
  "res-shelter-dharavi": {
    id: "res-shelter-dharavi",
    name: "Dharavi Community Camp Command",
    callsign: "SHELTER-HUB-01",
    type: "shelter",
    leaderName: "Officer Meera Patnaik",
    phone: "+91 98765 11004",
    status: "available",
    lat: 19.0400,
    lng: 72.8500,
    supplies: {
      foodRationKits: 450,
      foodRationCapacity: 600,
      waterLiters: 1500,
      waterCapacityLiters: 2500,
      medicalKits: 35,
      medicalKitsCapacity: 50,
      ivFluidsCount: 120,
      shelterBedsAvailable: 180,
      shelterBedsTotal: 350,
      lifeJackets: 20,
      fuelLiters: 200,
      satPhoneBatteryPct: 100,
    },
  },
};

export default function RescuerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const rescuerId = resolvedParams.id || "demo-team-alpha";

  const [session, setSession] = useState<RescuerUserSession | null>(null);
  const sessionRef = useRef<RescuerUserSession | null>(null);

  // Role state: defaults to Team Head, can be toggled
  const [isTeamHead, setIsTeamHead] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const [profile, setProfile] = useState<RescuerUnitProfile>(
    INITIAL_RESCUER_PROFILES[rescuerId] || INITIAL_RESCUER_PROFILES["demo-team-alpha"]
  );

  const [incidents, setIncidents] = useState<ReportItem[]>([]);
  const [assignedIncident, setAssignedIncident] = useState<ReportItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchRescuerSession().then((s) => {
      if (cancelled) return;
      sessionRef.current = s;
      setSession(s);
      if (s) {
        setIsTeamHead(s.isTeamHead);
        if (!s.isTeamHead) {
          setActiveTab("member-portal");
        }
      }
      loadData();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const userSession = sessionRef.current;
      let data: ReportItem[];
      if (userSession && userSession.officeLat && userSession.officeLng) {
        data = await apiGetIncidentsForOfficeRegion(
          userSession.officeLat,
          userSession.officeLng,
          userSession.regionRadiusKm || 35
        );
      } else {
        data = await apiGetAllIncidents();
      }
      setIncidents(data);

      const verifiedInc = data.find((i) => i.status === "verified" || i.status === "in_progress");
      if (verifiedInc) {
        setAssignedIncident(verifiedInc);
      }
    } catch (err) {
      console.warn("Could not load incidents for rescuer dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setProfile(INITIAL_RESCUER_PROFILES[rescuerId] || INITIAL_RESCUER_PROFILES["demo-team-alpha"]);
  }, [rescuerId]);

  function handleRoleToggle(head: boolean) {
    setIsTeamHead(head);
    if (head) {
      setActiveTab("overview");
    } else {
      setActiveTab("member-portal");
    }
  }

  function handleStatusChange(newStatus: "available" | "en_route" | "at_scene") {
    setProfile((prev) => ({ ...prev, status: newStatus }));
  }

  function handleAssignmentChange(
    incident: ReportItem | null,
    source: "admin_dispatch" | "nearest_fallback"
  ) {
    setAssignedIncident(incident);
    setProfile((prev) => ({
      ...prev,
      assignedReportId: incident?.id,
      assignmentSource: source,
    }));
  }

  function handleUpdateSupplies(updated: RescuerSupply) {
    setProfile((prev) => ({ ...prev, supplies: updated }));
  }

  const officeLat = session?.officeLat || profile.lat;
  const officeLng = session?.officeLng || profile.lng;
  const officeName = session?.officeName || "Brahmapur Regional Disaster Command";
  const commanderName = session?.name || profile.leaderName;

  return (
    <RescuerShell
      rescuerId={rescuerId}
      rescuerName={profile.name}
      status={profile.status}
      isTeamHead={isTeamHead}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onToggleRole={handleRoleToggle}
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
              <span>·</span>
              <span>{officeName}</span>
              <span>·</span>
              <span className="flex items-center gap-1 font-mono">
                <MapPin size={12} /> {officeLat.toFixed(4)}, {officeLng.toFixed(4)}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleRoleToggle(!isTeamHead)}
              className="adm-btn"
            >
              {isTeamHead ? "Member view" : "Head view"}
            </button>
            <Link href="/rescuer/login" className="adm-btn">
              <LogIn size={14} /> Office login
            </Link>
            <button onClick={loadData} className="adm-btn">
              <RotateCw size={14} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          A. RESCUE TEAM HEAD VIEWS
         ═════════════════════════════════════════════════════════════════════ */}
      {isTeamHead && (
        <>
          {/* TAB 1: OVERVIEW / DASHBOARD */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Quick Navigation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    tab: "district-head",
                    icon: Radio,
                    title: "District Head",
                    desc: "Orders and messages from the district office.",
                  },
                  {
                    tab: "disasters",
                    icon: Eye,
                    title: "Radar",
                    desc: "Live citizen SOS incidents near your office.",
                  },
                  {
                    tab: "allocate",
                    icon: PackagePlus,
                    title: "Allocate",
                    desc: "Assign ration and resource quotas to members.",
                  },
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

              {/* Disaster Assignment & Fail-Safe Control */}
              <DisasterAssignmentCard
                rescuerId={rescuerId}
                rescuerType={profile.type}
                rescuerLat={profile.lat}
                rescuerLng={profile.lng}
                assignedIncident={assignedIncident}
                allIncidents={incidents}
                onAssignmentChange={handleAssignmentChange}
                onStatusChange={handleStatusChange}
              />

              {/* Rescue Team Head Resource Estimator & Directive Broadcast */}
              <RescueHeadResourceEstimator
                assignedIncident={assignedIncident}
                rescuerId={rescuerId}
                leaderName={commanderName}
              />

              {/* Rescue Team Head Direct Volunteer Request Stream */}
              <TeamHeadVolunteerPool
                officeLat={officeLat}
                officeLng={officeLng}
                officeName={officeName}
                isTeamHead={true}
              />

              {/* Field Supply & Capacity Inventory Tracker */}
              <SupplyTracker
                initialSupplies={profile.supplies}
                onUpdateSupplies={handleUpdateSupplies}
              />
            </div>
          )}

          {/* TAB 2: READ-ONLY DISASTER MAP */}
          {activeTab === "disasters" && (
            <ReadOnlyDisasterMap
              incidents={incidents}
              userLat={officeLat}
              userLng={officeLng}
              officeName={officeName}
            />
          )}

          {/* TAB 3: DISTRICT HEAD CONNECTION (EXCLUSIVE FOR RESCUE TEAM HEAD) */}
          {activeTab === "district-head" && (
            <DistrictHeadConnection
              headUnitId={rescuerId}
              headName={commanderName}
              officeName={officeName}
            />
          )}

          {/* TAB 4: RATION & RESOURCE ALLOCATION TO MEMBERS */}
          {activeTab === "allocate" && (
            <MemberResourceAllocationManager
              teamId={rescuerId}
              headName={commanderName}
              headOffice={officeName}
            />
          )}

          {/* TAB 5: VOLUNTEER POOL */}
          {activeTab === "volunteers" && (
            <TeamHeadVolunteerPool
              officeLat={officeLat}
              officeLng={officeLng}
              officeName={officeName}
              isTeamHead={true}
            />
          )}

          {/* TAB 6: SUPPLY INVENTORY */}
          {activeTab === "supplies" && (
            <SupplyTracker
              initialSupplies={profile.supplies}
              onUpdateSupplies={handleUpdateSupplies}
            />
          )}
        </>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          B. NORMAL RESCUE TEAM MEMBER VIEWS
         ═════════════════════════════════════════════════════════════════════ */}
      {!isTeamHead && (
        <>
          {/* TAB 1: MEMBER ORDERS & LIVE RESOURCE COMPLETION */}
          {activeTab === "member-portal" && (
            <MemberFieldPortal
              teamId={rescuerId}
              teamName={profile.name}
              memberId="mem-01"
              memberName="Officer Ramesh Patnaik"
              headName={commanderName}
              headPhone={profile.phone || "+91 98765 11001"}
              headOffice={officeName}
            />
          )}

          {/* TAB 2: MEMBER UNIT SUPPLIES */}
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
