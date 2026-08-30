"use client";

import { useState, useEffect } from "react";
import { 
  ReportItem, 
  HeadResourceEstimation, 
  apiSaveHeadResourceEstimation, 
  apiGetHeadResourceEstimation 
} from "@/lib/api";
import {
  Calculator,
  Send,
  CheckCircle2,
  Radio,
  Utensils,
  Droplet,
  Stethoscope,
  LifeBuoy,
  Fuel,
  Wrench,
  MapPin,
  Award,
} from "lucide-react";

interface RescueHeadResourceEstimatorProps {
  assignedIncident: ReportItem | null;
  rescuerId: string;
  leaderName: string;
  onEstimationConfirmed?: (estimation: HeadResourceEstimation) => void;
}

export function RescueHeadResourceEstimator({
  assignedIncident,
  rescuerId,
  leaderName,
  onEstimationConfirmed,
}: RescueHeadResourceEstimatorProps) {
  const [estimation, setEstimation] = useState<HeadResourceEstimation | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Input states — start blank until the head calculates a baseline or edits.
  const [foodKits, setFoodKits] = useState<number>(0);
  const [waterLiters, setWaterLiters] = useState<number>(0);
  const [medicalKits, setMedicalKits] = useState<number>(0);
  const [lifeJackets, setLifeJackets] = useState<number>(0);
  const [fuelLiters, setFuelLiters] = useState<number>(0);
  const [equipment, setEquipment] = useState<string>("");
  const [areaRadius, setAreaRadius] = useState<number>(2);

  const incidentId = assignedIncident?.id;
  const locationName =
    assignedIncident?.address ||
    assignedIncident?.description?.split("]")[0]?.replace("[", "") ||
    "";

  // Demand signal derived from the linked incident cluster.
  const requestsCount =
    assignedIncident?.report_count ?? assignedIncident?.cluster_count ?? 0;
  // Assume an average household size per logged report when no headcount is available.
  const peopleCount = requestsCount > 0 ? requestsCount * 4 : 0;

  // Load existing estimation for this incident if available
  useEffect(() => {
    if (!incidentId) return;
    async function loadEst() {
      const existing = await apiGetHeadResourceEstimation(incidentId!, rescuerId);
      if (existing) {
        setEstimation(existing);
        setFoodKits(existing.estimatedFoodKits);
        setWaterLiters(existing.estimatedWaterLiters);
        setMedicalKits(existing.estimatedMedicalKits);
        setLifeJackets(existing.estimatedLifeJackets);
        setFuelLiters(existing.estimatedFuelLiters);
        setEquipment(existing.specialEquipment);
        setAreaRadius(existing.areaRadiusKm);
      }
    }
    loadEst();
  }, [incidentId, rescuerId]);

  // Auto-calculate smart baseline from the incident's demand signal.
  function handleAutoCalculate() {
    if (peopleCount <= 0) {
      setSuccessMsg("No headcount signal on the linked incident — enter quotas manually.");
      setTimeout(() => setSuccessMsg(null), 3500);
      return;
    }
    setFoodKits(Math.max(15, peopleCount * 3 + 10));
    setWaterLiters(Math.max(80, peopleCount * 10 + 50));
    setMedicalKits(Math.max(4, Math.ceil(peopleCount / 3) + 2));
    setLifeJackets(Math.max(10, peopleCount + 5));
    setFuelLiters(Math.max(20, Math.ceil(areaRadius * 15)));

    setSuccessMsg(`Baseline computed for ~${peopleCount} people across ${requestsCount} reports.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  async function handleConfirmEstimation(e: React.FormEvent) {
    e.preventDefault();
    if (!incidentId) return;
    setLoading(true);
    try {
      const payload: Partial<HeadResourceEstimation> = {
        incidentId,
        unitId: rescuerId,
        leaderName,
        locationName,
        areaRadiusKm: areaRadius,
        totalRequestsCount: requestsCount,
        totalPeopleCount: peopleCount,
        estimatedFoodKits: foodKits,
        estimatedWaterLiters: waterLiters,
        estimatedMedicalKits: medicalKits,
        estimatedLifeJackets: lifeJackets,
        estimatedFuelLiters: fuelLiters,
        specialEquipment: equipment,
      };

      const saved = await apiSaveHeadResourceEstimation(payload);
      setEstimation(saved);
      setSuccessMsg(`Official Team Plan Broadcasted! All rescuers on ${leaderName}'s team are advised to follow this estimation.`);
      if (onEstimationConfirmed) {
        onEstimationConfirmed(saved);
      }
    } catch (err) {
      console.warn("Could not save estimation:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adm-card space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 pb-4 border-b border-slate-200">
        <div>
          <span className="eyebrow">Team-leader authority panel</span>
          <h2 className="section-title mt-1">Rescue team head resource estimator</h2>
          <p className="text-xs text-slate-500 mt-1">
            Set resource requirements based on area size and incoming SOS request volume.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAutoCalculate}
          className="adm-btn"
          disabled={!assignedIncident}
        >
          <Calculator size={14} /> Auto-calculate baseline
        </button>
      </div>

      {!assignedIncident && (
        <div className="adm-note">
          <span>
            No active incident is linked to this unit yet. Accept a dispatch on the assignment
            card above to broadcast a resource plan.
          </span>
        </div>
      )}

      {/* Sector analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="adm-kv">
          <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-500" /> Target sector</span>
          <strong className="truncate">{locationName || "Not linked"}</strong>
        </div>
        <div className="adm-kv">
          <span className="flex items-center gap-1.5"><Radio size={14} className="text-slate-500" /> Admin SOS</span>
          <strong>{requestsCount} req · {peopleCount} ppl</strong>
        </div>
        <div className="adm-kv">
          <span className="flex items-center gap-1.5"><Award size={14} className="text-slate-500" /> Commander</span>
          <strong className="truncate">{leaderName}</strong>
        </div>
      </div>

      {successMsg && (
        <div className="adm-note">
          <CheckCircle2 size={15} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Estimation form */}
      <form onSubmit={handleConfirmEstimation} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <label className="adm-field">
            <span><Utensils size={13} /> Food ration kits</span>
            <input type="number" min="1" value={foodKits} onChange={(e) => setFoodKits(parseInt(e.target.value) || 0)} />
          </label>
          <label className="adm-field">
            <span><Droplet size={13} /> Clean water (L)</span>
            <input type="number" min="1" value={waterLiters} onChange={(e) => setWaterLiters(parseInt(e.target.value) || 0)} />
          </label>
          <label className="adm-field">
            <span><Stethoscope size={13} /> Medical &amp; triage kits</span>
            <input type="number" min="1" value={medicalKits} onChange={(e) => setMedicalKits(parseInt(e.target.value) || 0)} />
          </label>
          <label className="adm-field">
            <span><LifeBuoy size={13} /> Life jackets / vests</span>
            <input type="number" min="1" value={lifeJackets} onChange={(e) => setLifeJackets(parseInt(e.target.value) || 0)} />
          </label>
          <label className="adm-field">
            <span><Fuel size={13} /> Vehicle / boat fuel (L)</span>
            <input type="number" min="1" value={fuelLiters} onChange={(e) => setFuelLiters(parseInt(e.target.value) || 0)} />
          </label>
          <label className="adm-field">
            <span><MapPin size={13} /> Sector risk radius (km)</span>
            <input type="number" step="0.5" min="0.5" value={areaRadius} onChange={(e) => setAreaRadius(parseFloat(e.target.value) || 1)} />
          </label>
        </div>

        <label className="adm-field">
          <span><Wrench size={13} /> Special gear / heavy equipment</span>
          <input
            type="text"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            placeholder="e.g. hydraulic cutters, searchlights, inflatable boat"
          />
        </label>

        <button type="submit" disabled={loading || !assignedIncident} className="adm-btn adm-btn--primary w-full justify-center">
          <Send size={15} />
          {loading ? "Broadcasting…" : "Confirm & broadcast team resource plan"}
        </button>
      </form>

      {/* Broadcasted directive */}
      {estimation && (
        <div className="adm-card adm-card--plain space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="eyebrow">Official team directive plan</span>
            <span className="text-[11px] text-slate-400 font-mono">
              Set {new Date(estimation.setAt).toLocaleTimeString()}
            </span>
          </div>

          <h4 className="font-bold text-sm text-slate-900">
            Commander {estimation.leaderName}&rsquo;s plan for {estimation.locationName}
          </h4>

          <p className="text-xs text-slate-600">
            All field rescuers deployed to <b>{estimation.locationName}</b> ({estimation.areaRadiusKm} km radius)
            are advised to follow this allocation before departing.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-200">
            {[
              ["Food kits", estimation.estimatedFoodKits],
              ["Water (L)", estimation.estimatedWaterLiters],
              ["Medical kits", estimation.estimatedMedicalKits],
              ["Life jackets", estimation.estimatedLifeJackets],
              ["Fuel (L)", estimation.estimatedFuelLiters],
            ].map(([label, val]) => (
              <div key={label as string} className="border border-slate-200 p-2 text-center">
                <span className="block text-[10px] uppercase text-slate-500 font-semibold tracking-wide">{label}</span>
                <span className="font-mono font-bold text-slate-900">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
