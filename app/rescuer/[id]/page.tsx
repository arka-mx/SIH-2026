"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RescueHeadResourceEstimator } from "@/components/rescuer/RescueHeadResourceEstimator";
import { RescuerShell } from "@/components/rescuer/RescuerShell";
import { SupplyTracker } from "@/components/rescuer/SupplyTracker";
import { DisasterAssignmentCard } from "@/components/rescuer/DisasterAssignmentCard";
import { IncidentMap } from "@/components/incidents/IncidentMap";
import { apiGetAllIncidents, apiGetIncidentsForOfficeRegion, ReportItem } from "@/lib/api";
import { fetchRescuerSession, RescuerUserSession } from "@/lib/rescuerAuth";
import { RescuerSupply, RescuerUnitProfile } from "@/types/rescuer";
import { RotateCw, MapPin, LogIn } from "lucide-react";

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
    lat: 19.0760,
    lng: 72.8777,
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
          userSession.regionRadiusKm || 25
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

  return (
    <RescuerShell
      rescuerId={rescuerId}
      rescuerName={profile.name}
      status={profile.status}
    >
      {/* Session / regional office */}
      <div className="adm-card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="adm-status adm-status--mute font-mono">{profile.callsign}</span>
              <span className="adm-status adm-status--blue">
                {session?.isTeamHead ? "Team head / commander" : "Field rescuer"}
              </span>
              {session && (
                <span className="adm-status adm-status--green">
                  {session.officeName} · {session.regionRadiusKm} km
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-slate-900">
              {profile.name}
              {session && (
                <span className="ml-2 text-xs font-normal text-slate-500">({session.email})</span>
              )}
            </h1>

            <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <span>Commander: <b className="text-slate-800">{session?.name || profile.leaderName}</b></span>
              <span>·</span>
              <span>Office base: <b className="text-slate-800">{session?.officeName || "Regional Base Command"}</b></span>
              <span>·</span>
              <span className="flex items-center gap-1 font-mono">
                <MapPin size={12} /> {(session?.officeLat ?? profile.lat).toFixed(4)}, {(session?.officeLng ?? profile.lng).toFixed(4)}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/rescuer/login" className="adm-btn">
              <LogIn size={14} /> Office login
            </Link>
            <button onClick={loadData} className="adm-btn">
              <RotateCw size={14} /> Refresh
            </button>
          </div>
        </div>
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
        leaderName={profile.leaderName}
      />

      {/* Map View of Assigned / Nearest Disaster */}
      <div className="space-y-2">
        <h3 className="eyebrow">Active tactical map</h3>
        <IncidentMap
          incidents={assignedIncident ? [assignedIncident] : incidents}
          selectedIncidentId={assignedIncident?.id}
          isConnected={true}
        />
      </div>

      {/* Field Supply & Capacity Inventory Tracker */}
      <SupplyTracker
        initialSupplies={profile.supplies}
        onUpdateSupplies={handleUpdateSupplies}
      />
    </RescuerShell>
  );
}
