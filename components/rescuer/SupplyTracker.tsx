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
  CheckCircle2,
  Plus,
  Minus,
} from "lucide-react";
import { RescuerSupply } from "@/types/rescuer";

interface SupplyTrackerProps {
  initialSupplies: RescuerSupply;
  onUpdateSupplies?: (updated: RescuerSupply) => void;
}

export function SupplyTracker({ initialSupplies, onUpdateSupplies }: SupplyTrackerProps) {
  const [supplies, setSupplies] = useState<RescuerSupply>(initialSupplies);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  function handleChange(key: keyof RescuerSupply, delta: number, maxCapKey?: keyof RescuerSupply) {
    const currentVal = supplies[key] as number;
    const maxCap = maxCapKey ? (supplies[maxCapKey] as number) : Infinity;
    const newVal = Math.max(0, Math.min(maxCap, currentVal + delta));
    const updated = { ...supplies, [key]: newVal };
    setSupplies(updated);
    if (onUpdateSupplies) onUpdateSupplies(updated);
    setUpdateMsg(`Updated ${key.replace(/([A-Z])/g, " $1").toLowerCase()}`);
    setTimeout(() => setUpdateMsg(null), 2500);
  }

  const cards = [
    {
      icon: Utensils,
      label: "Food ration kits",
      value: `${supplies.foodRationKits}`,
      sub: `Cap ${supplies.foodRationCapacity} packs`,
      pct: Math.round((supplies.foodRationKits / (supplies.foodRationCapacity || 1)) * 100),
      dec: () => handleChange("foodRationKits", -5),
      inc: () => handleChange("foodRationKits", 20, "foodRationCapacity"),
      decLabel: "−5",
      incLabel: "+20",
    },
    {
      icon: Droplets,
      label: "Drinking water",
      value: `${supplies.waterLiters} L`,
      sub: `Cap ${supplies.waterCapacityLiters} L`,
      pct: Math.round((supplies.waterLiters / (supplies.waterCapacityLiters || 1)) * 100),
      dec: () => handleChange("waterLiters", -20),
      inc: () => handleChange("waterLiters", 50, "waterCapacityLiters"),
      decLabel: "−20 L",
      incLabel: "+50 L",
    },
    {
      icon: HeartPulse,
      label: "Medical supplies",
      value: `${supplies.medicalKits} kits`,
      sub: `IV fluids ${supplies.ivFluidsCount}`,
      pct: Math.round((supplies.medicalKits / (supplies.medicalKitsCapacity || 1)) * 100),
      dec: () => handleChange("medicalKits", -1),
      inc: () => handleChange("medicalKits", 5, "medicalKitsCapacity"),
      decLabel: "−1",
      incLabel: "+5",
    },
    {
      icon: Home,
      label: "Shelter camp capacity",
      value: `${supplies.shelterBedsAvailable} beds`,
      sub: `Total ${supplies.shelterBedsTotal}`,
      pct: Math.round((supplies.shelterBedsAvailable / (supplies.shelterBedsTotal || 1)) * 100),
      dec: () => handleChange("shelterBedsAvailable", -10),
      inc: () => handleChange("shelterBedsAvailable", 10, "shelterBedsTotal"),
      decLabel: "Admit 10",
      incLabel: "Free 10",
    },
  ];

  const gear = [
    { icon: Fuel, label: "Vehicle fuel", value: `${supplies.fuelLiters} L` },
    { icon: BatteryCharging, label: "Sat-phone", value: `${supplies.satPhoneBatteryPct}%` },
    { icon: Package, label: "Life vests", value: `${supplies.lifeJackets} units` },
    { icon: Package, label: "Night searchlights", value: "Ready (4/4)" },
  ];

  return (
    <div className="adm-card space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-2 pb-4 border-b border-slate-200">
        <div>
          <span className="eyebrow">Field supply &amp; logistics</span>
          <h2 className="section-title mt-1">Team &amp; shelter capacity inventory</h2>
        </div>
        {updateMsg && (
          <span className="adm-status adm-status--green">
            <CheckCircle2 size={12} /> {updateMsg}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const low = c.pct < 20;
          return (
            <div key={c.label} className="adm-tile space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold text-sm text-slate-900">
                  <Icon size={16} className="text-slate-500" /> {c.label}
                </span>
                <span className="font-mono text-xs font-bold text-slate-500">{c.pct}%</span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="adm-tile__num">{c.value}</span>
                <span className="text-xs text-slate-500">{c.sub}</span>
              </div>

              <div className={`adm-meter ${low ? "adm-meter--low" : ""}`}>
                <span style={{ width: `${Math.min(100, Math.max(0, c.pct))}%` }} />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button onClick={c.dec} className="adm-btn flex-1 justify-center">
                  <Minus size={12} /> {c.decLabel}
                </button>
                <button onClick={c.inc} className="adm-btn adm-btn--primary flex-1 justify-center">
                  <Plus size={12} /> {c.incLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-slate-200">
        <h3 className="eyebrow mb-3">Gear &amp; operational readiness</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {gear.map((g, i) => {
            const Icon = g.icon;
            return (
              <div key={i} className="adm-kv">
                <span className="flex items-center gap-1.5 font-medium">
                  <Icon size={14} className="text-slate-500" /> {g.label}
                </span>
                <strong className="font-mono">{g.value}</strong>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
