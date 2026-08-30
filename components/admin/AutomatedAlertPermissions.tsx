"use client";

import { useState } from "react";
import { CheckCircle2, MapPin, ToggleLeft, ToggleRight } from "lucide-react";
import {
  PredeterminedPermissionSettings,
  apiUpdateAutomatedPermissions,
  apiToggleRadicalRegionRule,
} from "@/lib/api";

interface AutomatedAlertPermissionsProps {
  settings: PredeterminedPermissionSettings;
  onUpdate?: () => void;
}

export function AutomatedAlertPermissions({ settings, onUpdate }: AutomatedAlertPermissionsProps) {
  const [currentSettings, setCurrentSettings] = useState<PredeterminedPermissionSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function handleToggleRadicalAutoAlert() {
    const updated = {
      ...currentSettings,
      radicalRegionsAutoAlertEnabled: !currentSettings.radicalRegionsAutoAlertEnabled,
    };
    setCurrentSettings(updated);
    await saveSettings(updated);
  }

  async function handleClusterChange(num: number) {
    const updated = { ...currentSettings, minReportClusterForAutoDispatch: num };
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
      setSaveMessage("Automated dispatch rules saved.");
      if (onUpdate) onUpdate();
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Failed to save permission settings:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="adm-card space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-2 pb-4 border-b border-slate-200">
        <h2 className="section-title">Auto-alert rules</h2>
        {saveMessage && (
          <span className="adm-status adm-status--green">
            <CheckCircle2 size={12} /> Saved
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Direct citizen-to-rescuer auto-alert */}
        <div className="border border-slate-200 border-l-[3px] border-l-[color:var(--a-accent)] bg-slate-50 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Auto-alert rescuers</h3>
              <p className="text-xs text-slate-500 mt-0.5">In high-risk regions</p>
            </div>
            <button
              onClick={handleToggleRadicalAutoAlert}
              disabled={saving}
              className="text-slate-700 disabled:opacity-50"
              title="Toggle"
            >
              {currentSettings.radicalRegionsAutoAlertEnabled ? (
                <ToggleRight size={30} className="text-[color:var(--a-accent)]" />
              ) : (
                <ToggleLeft size={30} className="text-slate-400" />
              )}
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            SOS from high-risk regions skips triage and broadcasts to teams within 5&nbsp;km.
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Status</span>
            <span
              className={`adm-status ${
                currentSettings.radicalRegionsAutoAlertEnabled ? "adm-status--green" : "adm-status--mute"
              }`}
            >
              {currentSettings.radicalRegionsAutoAlertEnabled ? "On" : "Manual"}
            </span>
          </div>
        </div>

        {/* Cluster threshold */}
        <div className="border border-slate-200 border-l-[3px] border-l-slate-400 bg-slate-50 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Auto-dispatch threshold</h3>
              <p className="text-xs text-slate-500 mt-0.5">Reports needed to trigger</p>
            </div>
            <span className="adm-status adm-status--blue">
              {currentSettings.minReportClusterForAutoDispatch}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Clustered SOS reports that auto-trigger resource allocation and alert nearby units.
          </p>

          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Reports</span>
            <div className="adm-segment">
              {[1, 2, 3].map((val) => (
                <button
                  key={val}
                  onClick={() => handleClusterChange(val)}
                  data-active={currentSettings.minReportClusterForAutoDispatch === val}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* High-risk region registry */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="eyebrow">High-risk regions</h3>
          <span className="text-xs text-slate-400 font-mono">{currentSettings.regions.length}</span>
        </div>

        <div className="space-y-2">
          {currentSettings.regions.map((region) => (
            <div
              key={region.id}
              className={`border border-slate-200 border-l-[3px] p-4 ${
                region.enabled ? "border-l-[color:var(--a-accent)] bg-white" : "border-l-slate-300 bg-slate-50 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="mt-0.5 text-slate-500 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm font-bold text-slate-900">{region.regionName}</strong>
                      <span
                        className={`adm-status ${
                          region.riskLevel === "extreme_radical" ? "adm-status--red" : "adm-status--amber"
                        }`}
                      >
                        {region.riskLevel.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5 flex-wrap font-mono">
                      <span>{region.radiusKm} km</span>
                      <span>Broadcast {region.autoBroadcastSosToRescuers ? "on" : "off"}</span>
                      <span>{region.rescuerAuthorityLevel.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Alerts</span>
                    <span className="text-sm font-bold text-slate-900">{region.activeAlertsCount}</span>
                  </div>
                  <button
                    onClick={() => handleToggleRegion(region.id, region.enabled)}
                    className={`adm-btn ${region.enabled ? "adm-btn--danger" : ""}`}
                  >
                    {region.enabled ? "Disable" : "Enable"}
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
