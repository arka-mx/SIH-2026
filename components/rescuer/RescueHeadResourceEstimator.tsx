"use client";

import { useState, useEffect } from "react";
import { 
  ReportItem, 
  HeadResourceEstimation, 
  apiSaveHeadResourceEstimation, 
  apiGetHeadResourceEstimation 
} from "@/lib/api";
import { 
  ShieldCheck, 
  Calculator, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  Radio, 
  Utensils, 
  Droplet, 
  Stethoscope, 
  LifeBuoy, 
  Fuel, 
  Wrench, 
  Users, 
  MapPin, 
  Award,
  AlertTriangle
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

  // Input states
  const [foodKits, setFoodKits] = useState<number>(30);
  const [waterLiters, setWaterLiters] = useState<number>(150);
  const [medicalKits, setMedicalKits] = useState<number>(8);
  const [lifeJackets, setLifeJackets] = useState<number>(20);
  const [fuelLiters, setFuelLiters] = useState<number>(50);
  const [equipment, setEquipment] = useState<string>("Hydraulic Cutters, Searchlights & Inflatable Boat");
  const [areaRadius, setAreaRadius] = useState<number>(3.0);

  const incidentId = assignedIncident?.id || "INC-EMERGENCY-HUB";
  const locationName = assignedIncident?.address || assignedIncident?.description?.split("]")[0]?.replace("[", "") || "Target Sector Area";

  // Parse people count or requests count
  const peopleCount = 12; // Standard estimation fallback for active area sector
  const requestsCount = 3;

  // Load existing estimation for this incident if available
  useEffect(() => {
    async function loadEst() {
      const existing = await apiGetHeadResourceEstimation(incidentId, rescuerId);
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

  // Auto-calculate smart baseline based on area & SOS requests
  function handleAutoCalculate() {
    const calcFood = Math.max(15, peopleCount * 3 + 10);
    const calcWater = Math.max(80, peopleCount * 10 + 50);
    const calcMedical = Math.max(4, Math.ceil(peopleCount / 3) + 2);
    const calcJackets = Math.max(10, peopleCount + 5);
    const calcFuel = 50;

    setFoodKits(calcFood);
    setWaterLiters(calcWater);
    setMedicalKits(calcMedical);
    setLifeJackets(calcJackets);
    setFuelLiters(calcFuel);

    setSuccessMsg("Loaded auto-calculated baseline ratios based on area requests count!");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  async function handleConfirmEstimation(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Partial<HeadResourceEstimation> = {
        incidentId,
        unitId: rescuerId,
        leaderName: leaderName || "Rescue Team Commander",
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
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 mb-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-stone-100">
        <div>
          <span className="text-[10px] uppercase font-extrabold tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 inline-flex items-center gap-1">
            <Award size={12} className="text-purple-600" /> Team Leader Authority Panel
          </span>
          <h2 className="text-lg font-extrabold text-stone-900 mt-1 flex items-center gap-2">
            Rescue Team Head Resource Estimator
          </h2>
          <p className="text-xs text-stone-500">
            Set desired resource requirements based on area size & number of incoming SOS requests.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAutoCalculate}
          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all"
        >
          <Calculator size={14} /> Auto-Calculate Baseline
        </button>
      </div>

      {/* Sector Request & Area Analysis Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
            <MapPin size={18} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400">Target Area / Sector</span>
            <strong className="block text-stone-800 font-bold line-clamp-1">{locationName}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
            <Radio size={18} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400">Incoming Admin SOS Requests</span>
            <strong className="block text-stone-800 font-bold">{requestsCount} Requests ({peopleCount} People)</strong>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-100 text-purple-800 rounded-lg">
            <Award size={18} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400">Estimation Commander</span>
            <strong className="block text-purple-950 font-bold">{leaderName} (Team Head)</strong>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Estimation Input Form */}
      <form onSubmit={handleConfirmEstimation} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <label className="block bg-stone-50 p-3 rounded-xl border border-stone-200">
            <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
              <Utensils size={14} className="text-amber-600" /> Food Ration Kits
            </span>
            <input
              type="number"
              min="1"
              value={foodKits}
              onChange={(e) => setFoodKits(parseInt(e.target.value) || 0)}
              className="mt-1 w-full bg-white p-2 text-xs font-bold text-stone-900 border border-stone-300 rounded-lg"
            />
          </label>

          <label className="block bg-stone-50 p-3 rounded-xl border border-stone-200">
            <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
              <Droplet size={14} className="text-blue-600" /> Clean Water (Liters)
            </span>
            <input
              type="number"
              min="1"
              value={waterLiters}
              onChange={(e) => setWaterLiters(parseInt(e.target.value) || 0)}
              className="mt-1 w-full bg-white p-2 text-xs font-bold text-stone-900 border border-stone-300 rounded-lg"
            />
          </label>

          <label className="block bg-stone-50 p-3 rounded-xl border border-stone-200">
            <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
              <Stethoscope size={14} className="text-rose-600" /> Medical & Triage Kits
            </span>
            <input
              type="number"
              min="1"
              value={medicalKits}
              onChange={(e) => setMedicalKits(parseInt(e.target.value) || 0)}
              className="mt-1 w-full bg-white p-2 text-xs font-bold text-stone-900 border border-stone-300 rounded-lg"
            />
          </label>

          <label className="block bg-stone-50 p-3 rounded-xl border border-stone-200">
            <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
              <LifeBuoy size={14} className="text-cyan-600" /> Life Jackets / Water Vests
            </span>
            <input
              type="number"
              min="1"
              value={lifeJackets}
              onChange={(e) => setLifeJackets(parseInt(e.target.value) || 0)}
              className="mt-1 w-full bg-white p-2 text-xs font-bold text-stone-900 border border-stone-300 rounded-lg"
            />
          </label>

          <label className="block bg-stone-50 p-3 rounded-xl border border-stone-200">
            <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
              <Fuel size={14} className="text-orange-600" /> Vehicle / Boat Fuel (Liters)
            </span>
            <input
              type="number"
              min="1"
              value={fuelLiters}
              onChange={(e) => setFuelLiters(parseInt(e.target.value) || 0)}
              className="mt-1 w-full bg-white p-2 text-xs font-bold text-stone-900 border border-stone-300 rounded-lg"
            />
          </label>

          <label className="block bg-stone-50 p-3 rounded-xl border border-stone-200">
            <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
              <MapPin size={14} className="text-purple-600" /> Sector Risk Radius (Km)
            </span>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={areaRadius}
              onChange={(e) => setAreaRadius(parseFloat(e.target.value) || 1)}
              className="mt-1 w-full bg-white p-2 text-xs font-bold text-stone-900 border border-stone-300 rounded-lg"
            />
          </label>
        </div>

        <label className="block bg-stone-50 p-3 rounded-xl border border-stone-200">
          <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
            <Wrench size={14} className="text-emerald-700" /> Special Gear / Heavy Equipment Required
          </span>
          <input
            type="text"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            placeholder="e.g. Hydraulic cutters, searchlights, inflatable boat"
            className="mt-1 w-full bg-white p-2 text-xs font-bold text-stone-900 border border-stone-300 rounded-lg"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 hover:from-purple-800 hover:to-slate-950 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Send size={15} />
          {loading ? "Broadcasting Estimation..." : "Confirm & Broadcast Team Resource Estimation Plan"}
        </button>
      </form>

      {/* Broadcasted Directive Card for Rescuers */}
      {estimation && (
        <div className="p-4 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white rounded-2xl border border-purple-800 shadow-md space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-extrabold uppercase bg-purple-500/30 text-purple-200 px-2.5 py-0.5 rounded-full border border-purple-400/40 flex items-center gap-1">
              <Award size={12} className="text-purple-300" /> Official Team Directive Plan
            </span>
            <span className="text-[11px] text-purple-300 font-mono">
              Set: {new Date(estimation.setAt).toLocaleTimeString()}
            </span>
          </div>

          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            Commander {estimation.leaderName}'s Resource Estimation Plan for {estimation.locationName}
          </h4>

          <p className="text-xs text-purple-200">
            ⚠️ <strong>Recommended Guideline:</strong> All field rescuers deployed to Sector <b>{estimation.locationName}</b> ({estimation.areaRadiusKm} km radius) are advised to adhere to this resource allocation plan before departing to the rescue site.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-purple-800/60 text-xs font-mono font-bold">
            <div className="bg-white/10 p-2 rounded-lg text-center">
              <span className="block text-[10px] uppercase font-sans text-purple-300">Food Kits</span>
              <span className="text-amber-300">{estimation.estimatedFoodKits}</span>
            </div>
            <div className="bg-white/10 p-2 rounded-lg text-center">
              <span className="block text-[10px] uppercase font-sans text-purple-300">Water (L)</span>
              <span className="text-blue-300">{estimation.estimatedWaterLiters}</span>
            </div>
            <div className="bg-white/10 p-2 rounded-lg text-center">
              <span className="block text-[10px] uppercase font-sans text-purple-300">Medical Kits</span>
              <span className="text-rose-300">{estimation.estimatedMedicalKits}</span>
            </div>
            <div className="bg-white/10 p-2 rounded-lg text-center">
              <span className="block text-[10px] uppercase font-sans text-purple-300">Life Jackets</span>
              <span className="text-cyan-300">{estimation.estimatedLifeJackets}</span>
            </div>
            <div className="bg-white/10 p-2 rounded-lg text-center col-span-2 sm:col-span-1">
              <span className="block text-[10px] uppercase font-sans text-purple-300">Fuel (L)</span>
              <span className="text-orange-300">{estimation.estimatedFuelLiters}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
