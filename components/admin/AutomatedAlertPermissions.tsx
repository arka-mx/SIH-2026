"use client";

import { useState } from "react";
import { 
  ShieldAlert, 
  Zap, 
  Radio, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  ToggleLeft, 
  ToggleRight, 
  MapPin, 
  Flame, 
  Cpu, 
  Lock, 
  Layers 
} from "lucide-react";
import { 
  PredeterminedPermissionSettings, 
  RadicalRegionRule, 
  apiUpdateAutomatedPermissions, 
  apiToggleRadicalRegionRule 
} from "@/lib/api";

interface AutomatedAlertPermissionsProps {
  settings: PredeterminedPermissionSettings;
  onUpdate?: () => void;
}

export function AutomatedAlertPermissions({ settings, onUpdate }: AutomatedAlertPermissionsProps) {
  const [currentSettings, setCurrentSettings] = useState<PredeterminedPermissionSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function handleToggleGlobalAutoDispatch() {
    const updated = {
      ...currentSettings,
      globalAutoDispatchEnabled: !currentSettings.globalAutoDispatchEnabled,
    };
    setCurrentSettings(updated);
    await saveSettings(updated);
  }

  async function handleToggleRadicalAutoAlert() {
    const updated = {
      ...currentSettings,
      radicalRegionsAutoAlertEnabled: !currentSettings.radicalRegionsAutoAlertEnabled,
    };
    setCurrentSettings(updated);
    await saveSettings(updated);
  }

  async function handleClusterChange(num: number) {
    const updated = {
      ...currentSettings,
      minReportClusterForAutoDispatch: num,
    };
    setCurrentSettings(updated);
    await saveSettings(updated);
  }

  async function handleToggleRegion(regionId: string, currentEnabled: boolean) {
    try {
      await apiToggleRadicalRegionRule(regionId, !currentEnabled);
      const updatedRegions = currentSettings.regions.map((r) =>
        r.id === regionId ? { ...r, enabled: !currentEnabled } : r
      );
      const updated = { ...currentSettings, regions: updatedRegions };
      setCurrentSettings(updated);
      setSaveMessage(`Updated region permission for #${regionId}`);
      if (onUpdate) onUpdate();
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Could not toggle region:", err);
    }
  }

  async function saveSettings(newSettings: PredeterminedPermissionSettings) {
    setSaving(true);
    try {
      await apiUpdateAutomatedPermissions(newSettings);
      setSaveMessage("Predetermined permissions & automated dispatch rules saved successfully!");
      if (onUpdate) onUpdate();
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Failed to save permission settings:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-stone-100">
        <div>
          <span className="eyebrow uppercase text-[11px] text-stone-500 font-bold tracking-wider">Admin Policy & Automated Dispatch Rules</span>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <ShieldAlert size={20} className="text-purple-600" /> Predetermined Permissions & Radical Region Auto-Alerts
          </h2>
        </div>

        {saveMessage && (
          <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full font-semibold flex items-center gap-1 animate-fadeIn">
            <CheckCircle2 size={13} className="text-emerald-600" /> {saveMessage}
          </span>
        )}
      </div>

      {/* Global Automated Dispatch Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Direct Citizen-to-Rescuer Auto-Alert in Radical Regions */}
        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-600 text-white rounded-lg shadow-2xs">
                <Zap size={18} />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-sm">Direct Citizen-to-Rescuer Auto-Alert</h3>
                <p className="text-xs text-stone-500">Radical / Highly-Sensitive Disaster Regions</p>
              </div>
            </div>

            <button
              onClick={handleToggleRadicalAutoAlert}
              disabled={saving}
              className="text-purple-700 hover:text-purple-900 transition-all cursor-pointer"
              title="Toggle Direct Auto-Alerting"
            >
              {currentSettings.radicalRegionsAutoAlertEnabled ? (
                <ToggleRight size={32} className="text-purple-600" />
              ) : (
                <ToggleLeft size={32} className="text-stone-400" />
              )}
            </button>
          </div>

          <p className="text-xs text-stone-700 bg-white/80 p-2.5 rounded-lg border border-purple-200">
            When enabled, emergency SOS reports from citizens in <b>Radical Danger Regions</b> automatically bypass manual admin triage and broadcast immediately to nearest NDRF/SDRF rescue teams within 5km.
          </p>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="font-semibold text-stone-600">Status:</span>
            <span className={`font-bold px-2 py-0.5 rounded text-[11px] uppercase tracking-wider ${
              currentSettings.radicalRegionsAutoAlertEnabled ? "bg-purple-600 text-white" : "bg-stone-200 text-stone-700"
            }`}>
              {currentSettings.radicalRegionsAutoAlertEnabled ? "ACTIVE (Auto-Broadcast Enabled)" : "DISABLED (Manual Approval Required)"}
            </span>
          </div>
        </div>

        {/* Card 2: Minimum SOS Cluster Threshold */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-2xs">
                <Cpu size={18} />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-sm">Auto-Dispatch Trigger Threshold</h3>
                <p className="text-xs text-stone-500">PostGIS Clustering Rule Engine</p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-blue-900 bg-blue-100 px-2.5 py-1 rounded-full border border-blue-300">
              {currentSettings.minReportClusterForAutoDispatch} SOS Reports
            </span>
          </div>

          <p className="text-xs text-stone-700 bg-white/80 p-2.5 rounded-lg border border-blue-200">
            Number of spatial SOS clusters required to automatically trigger resource allocation and alert nearest field rescue units.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-stone-600 font-medium">Predetermined Threshold:</span>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((val) => (
                <button
                  key={val}
                  onClick={() => handleClusterChange(val)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                    currentSettings.minReportClusterForAutoDispatch === val
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-white text-stone-700 border-stone-300 hover:bg-blue-50"
                  }`}
                >
                  {val} {val === 1 ? 'SOS (Immediate)' : 'SOS Reports'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Radical Regions Registry & Predetermined Authority Table */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Flame size={16} className="text-rose-600" /> Predetermined Region Permissions Matrix (Radical Danger Zones)
          </h3>
          <span className="text-xs text-stone-500 font-mono">3 Defined Zones</span>
        </div>

        <div className="space-y-3">
          {currentSettings.regions.map((region) => (
            <div
              key={region.id}
              className={`p-4 rounded-xl border transition-all ${
                region.enabled ? "bg-white border-stone-200 shadow-2xs" : "bg-stone-50 border-stone-200 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl border text-white font-bold text-xs ${
                    region.riskLevel === "extreme_radical" ? "bg-rose-600 border-rose-700" : "bg-amber-500 border-amber-600"
                  }`}>
                    <MapPin size={18} />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-stone-900">{region.regionName}</strong>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        region.riskLevel === "extreme_radical" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {region.riskLevel.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-stone-600 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        Radius: <b>{region.radiusKm} km</b>
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        <Zap size={12} /> Auto-Broadcast: {region.autoBroadcastSosToRescuers ? "ENABLED" : "DISABLED"}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Authority Level: {region.rescuerAuthorityLevel.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs font-bold text-stone-800 block">Active Alerts</span>
                    <span className="text-xs font-mono font-bold text-rose-600">{region.activeAlertsCount} Reports</span>
                  </div>

                  <button
                    onClick={() => handleToggleRegion(region.id, region.enabled)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                      region.enabled
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-stone-200 hover:bg-stone-300 text-stone-700"
                    }`}
                  >
                    {region.enabled ? "Disable Rule" : "Enable Rule"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
