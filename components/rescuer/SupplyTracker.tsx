"use client";

import { useState } from "react";
import { 
  Package, 
  Utensils, 
  Home, 
  HeartPulse, 
  Droplets, 
  BatteryCharging, 
  Fuel, 
  ShieldCheck, 
  Plus, 
  Minus, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";
import { RescuerSupply } from "@/types/rescuer";

interface SupplyTrackerProps {
  initialSupplies: RescuerSupply;
  onUpdateSupplies?: (updated: RescuerSupply) => void;
}

export function SupplyTracker({
  initialSupplies,
  onUpdateSupplies,
}: SupplyTrackerProps) {
  const [supplies, setSupplies] = useState<RescuerSupply>(initialSupplies);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  function handleChange(key: keyof RescuerSupply, delta: number, maxCapKey?: keyof RescuerSupply) {
    const currentVal = supplies[key] as number;
    const maxCap = maxCapKey ? (supplies[maxCapKey] as number) : Infinity;
    const newVal = Math.max(0, Math.min(maxCap, currentVal + delta));
    const updated = { ...supplies, [key]: newVal };

    setSupplies(updated);
    if (onUpdateSupplies) {
      onUpdateSupplies(updated);
    }

    setUpdateMsg(`Updated ${key.replace(/([A-Z])/g, " $1")} state`);
    setTimeout(() => setUpdateMsg(null), 2500);
  }

  const foodPct = Math.round((supplies.foodRationKits / (supplies.foodRationCapacity || 1)) * 100);
  const waterPct = Math.round((supplies.waterLiters / (supplies.waterCapacityLiters || 1)) * 100);
  const medPct = Math.round((supplies.medicalKits / (supplies.medicalKitsCapacity || 1)) * 100);
  const bedPct = Math.round((supplies.shelterBedsAvailable / (supplies.shelterBedsTotal || 1)) * 100);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-stone-100">
        <div>
          <p className="eyebrow uppercase text-xs text-stone-500 font-bold tracking-wider">Field Supply & Logistics Tracker</p>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Package size={20} className="text-emerald-600" /> Rescue Team & Shelter Capacity Inventory
          </h2>
        </div>
        {updateMsg && (
          <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-semibold flex items-center gap-1 animate-fadeIn">
            <CheckCircle2 size={13} className="text-emerald-600" /> {updateMsg}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Food Ration Supplies */}
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900">
              <Utensils size={18} className="text-amber-600" />
              <span className="font-bold text-sm">Food Ration Kits</span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
              {foodPct}%
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-stone-900">{supplies.foodRationKits}</span>
            <span className="text-xs text-stone-500 font-medium">Cap: {supplies.foodRationCapacity} packs</span>
          </div>

          <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${foodPct < 20 ? "bg-red-500" : "bg-amber-500"}`}
              style={{ width: `${Math.min(100, foodPct)}%` }}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleChange("foodRationKits", -5)}
              className="flex-1 bg-white hover:bg-amber-100 border border-amber-300 text-stone-700 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
            >
              <Minus size={12} /> 5 Packs
            </button>
            <button
              onClick={() => handleChange("foodRationKits", 20, "foodRationCapacity")}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
            >
              <Plus size={12} /> 20 Packs
            </button>
          </div>
        </div>

        {/* 2. Drinking Water Supply */}
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-900">
              <Droplets size={18} className="text-blue-600" />
              <span className="font-bold text-sm">Drinking Water</span>
            </div>
            <span className="text-xs font-mono font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
              {waterPct}%
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-stone-900">{supplies.waterLiters} L</span>
            <span className="text-xs text-stone-500 font-medium">Cap: {supplies.waterCapacityLiters} L</span>
          </div>

          <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${waterPct < 20 ? "bg-red-500" : "bg-blue-600"}`}
              style={{ width: `${Math.min(100, waterPct)}%` }}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleChange("waterLiters", -20)}
              className="flex-1 bg-white hover:bg-blue-100 border border-blue-300 text-stone-700 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
            >
              <Minus size={12} /> 20L
            </button>
            <button
              onClick={() => handleChange("waterLiters", 50, "waterCapacityLiters")}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
            >
              <Plus size={12} /> 50L
            </button>
          </div>
        </div>

        {/* 3. Medicines & First Aid */}
        <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900">
              <HeartPulse size={18} className="text-rose-600" />
              <span className="font-bold text-sm">Medical Supplies</span>
            </div>
            <span className="text-xs font-mono font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
              {medPct}%
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-stone-900">{supplies.medicalKits} Kits</span>
            <span className="text-xs text-stone-500 font-medium">IV Fluids: {supplies.ivFluidsCount}</span>
          </div>

          <div className="w-full bg-rose-200/60 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${medPct < 20 ? "bg-stone-500" : "bg-rose-600"}`}
              style={{ width: `${Math.min(100, medPct)}%` }}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleChange("medicalKits", -1)}
              className="flex-1 bg-white hover:bg-rose-100 border border-rose-300 text-stone-700 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
            >
              <Minus size={12} /> 1 Kit
            </button>
            <button
              onClick={() => handleChange("medicalKits", 5, "medicalKitsCapacity")}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
            >
              <Plus size={12} /> 5 Kits
            </button>
          </div>
        </div>

        {/* 4. Shelter Capacity Tracking */}
        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900">
              <Home size={18} className="text-emerald-600" />
              <span className="font-bold text-sm">Shelter Camp Capacity</span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
              {bedPct}% Available
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-stone-900">{supplies.shelterBedsAvailable} Beds</span>
            <span className="text-xs text-stone-500 font-medium">Total: {supplies.shelterBedsTotal}</span>
          </div>

          <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${bedPct < 15 ? "bg-red-500" : "bg-emerald-600"}`}
              style={{ width: `${Math.min(100, bedPct)}%` }}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleChange("shelterBedsAvailable", -10)}
              className="flex-1 bg-white hover:bg-emerald-100 border border-emerald-300 text-stone-700 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
              title="Admit 10 citizens to shelter beds"
            >
              Admit 10
            </button>
            <button
              onClick={() => handleChange("shelterBedsAvailable", 10, "shelterBedsTotal")}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs"
              title="Free 10 shelter beds"
            >
              Free 10
            </button>
          </div>
        </div>
      </div>

      {/* Team Operational Necessities Checklist */}
      <div className="pt-4 border-t border-stone-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-600" /> Rescuer Gear & Operational Readiness
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-stone-700">
              <Fuel size={14} className="text-amber-600" /> Vehicle Fuel:
            </span>
            <strong className="font-mono text-stone-900">{supplies.fuelLiters} L</strong>
          </div>

          <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-stone-700">
              <BatteryCharging size={14} className="text-emerald-600" /> Sat-Phone:
            </span>
            <strong className="font-mono text-emerald-700">{supplies.satPhoneBatteryPct}%</strong>
          </div>

          <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-stone-700">
              <Package size={14} className="text-indigo-600" /> Life Vests:
            </span>
            <strong className="font-mono text-stone-900">{supplies.lifeJackets} units</strong>
          </div>

          <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-stone-700">
              <AlertTriangle size={14} className="text-rose-600" /> Night Searchlights:
            </span>
            <span className="font-bold text-emerald-700">Ready (4/4)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
