"use client";

import { useState, useEffect, FormEvent } from "react";
import { Send, CheckCircle2, MapPin, Navigation, AlertTriangle, X, ShieldAlert, Crown } from "lucide-react";
import {
  apiReverseGeocodeDetailed,
  apiSubmitVolunteerRequest,
  apiGetActiveReportForSession,
  apiGetActiveVolunteerPledgeForDevice,
  apiCancelVolunteerPledge,
  apiCancelSos,
  ReportItem,
} from "@/lib/api";
import { VolunteerPledge } from "@/types/rescuer";
import { getOrCreateDeviceId } from "@/lib/device";
import { getCachedActiveReport } from "@/lib/citizenSession";
import Link from "next/link";

export function VolunteerForm() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("Mumbai Hub Sector");
  const [regionName, setRegionName] = useState("Mumbai, Maharashtra");
  const [lat, setLat] = useState("19.0760");
  const [lng, setLng] = useState("72.8777");
  const [service, setService] = useState("Inflatable Motorboat");
  const [availability, setAvailability] = useState("Available Immediately");
  const [capacity, setCapacity] = useState("4 Persons");
  const [contact, setContact] = useState("");

  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeSos, setActiveSos] = useState<ReportItem | null>(() => {
    const cached = getCachedActiveReport();
    if (cached && cached.status !== "resolved" && cached.status !== "cancelled") {
      return cached;
    }
    return null;
  });
  const [activePledge, setActivePledge] = useState<VolunteerPledge | null>(null);
  const [cancellingSos, setCancellingSos] = useState(false);
  const [cancellingPledge, setCancellingPledge] = useState(false);

  const hasActiveSos = !!activeSos && activeSos.status !== "resolved" && activeSos.status !== "cancelled";

  async function checkUserStatuses() {
    try {
      const devId = getOrCreateDeviceId();
      const [sos, pledge] = await Promise.all([
        apiGetActiveReportForSession(devId),
        apiGetActiveVolunteerPledgeForDevice(devId),
      ]);
      setActiveSos(sos);
      setActivePledge(pledge);
    } catch (err) {
      console.warn("Could not check active SOS/Pledge status:", err);
    }
  }

  useEffect(() => {
    checkUserStatuses();
  }, []);

  async function handleCancelSosFirst() {
    if (cancellingSos) return;
    setCancellingSos(true);
    try {
      const devId = getOrCreateDeviceId();
      await apiCancelSos(devId, { reason: "Citizen cancelled SOS to register volunteer pledge" });
      setActiveSos(null);
    } catch (err) {
      setError("Could not cancel active SOS. Please try again.");
    } finally {
      setCancellingSos(false);
    }
  }

  async function handleCancelPledge() {
    if (!activePledge || cancellingPledge) return;
    setCancellingPledge(true);
    try {
      await apiCancelVolunteerPledge(activePledge.id);
      setActivePledge(null);
      setSuccess(false);
    } catch (err) {
      setError("Could not cancel volunteer pledge.");
    } finally {
      setCancellingPledge(false);
    }
  }

  async function handleDetectGPS() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setGpsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setLat(latitude.toFixed(6));
        setLng(longitude.toFixed(6));

        try {
          const detail = await apiReverseGeocodeDetailed(latitude, longitude);
          setLocation(detail.displayName);
          setRegionName(detail.region);
        } catch {
          setLocation(`Sector Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          setRegionName(`Region (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`);
        }
        setGpsLoading(false);
      },
      async (err) => {
        console.warn("GPS error fallback:", err);
        const fallbackLat = 19.0760;
        const fallbackLng = 72.8777;
        setLat(fallbackLat.toFixed(6));
        setLng(fallbackLng.toFixed(6));
        try {
          const detail = await apiReverseGeocodeDetailed(fallbackLat, fallbackLng);
          setLocation(detail.displayName);
          setRegionName(detail.region);
        } catch {
          setLocation("Mumbai Coastal Sector (Auto-detected)");
          setRegionName("Mumbai, Maharashtra");
        }
        setGpsLoading(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10000 }
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeSos) {
      setError("Cannot pledge while an active SOS emergency report is open. Please cancel your SOS first.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const devId = getOrCreateDeviceId();
      const created = await apiSubmitVolunteerRequest({
        volunteerName: name,
        contactPhone: contact || "+91 98765 00000",
        assetType: service,
        capacity,
        availability,
        locationName: location,
        region: regionName,
        lat: parseFloat(lat) || 19.0760,
        lng: parseFloat(lng) || 72.8777,
        deviceId: devId,
      });

      setActivePledge(created);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register volunteer request";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }


  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Community resource pool</p>
          <h1>Pledge</h1>
        </div>
      </div>

      {/* Active SOS Warning Banner: Citizens cannot report SOS & Pledge at the same time */}
      {activeSos && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-3 mb-4">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm text-amber-900">
                Active SOS Emergency Report Detected ({activeSos.id})
              </h3>
              <p className="text-xs text-amber-800 mt-1">
                A citizen cannot report an emergency SOS and submit a volunteer resource pledge at the same time. Please cancel your active SOS if you wish to offer volunteer resources instead.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleCancelSosFirst}
              disabled={cancellingSos}
              className="adm-btn adm-btn--danger text-xs font-bold"
            >
              <X size={14} />
              {cancellingSos ? "Cancelling SOS..." : "Cancel Active SOS & Proceed to Pledge"}
            </button>
            <Link href="/citizen" className="text-xs text-amber-900 font-semibold underline">
              Return to Citizen SOS Dashboard →
            </Link>
          </div>
        </div>
      )}

      {/* Active Volunteer Pledge Card with Cancel Option */}
      {activePledge && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg space-y-3 mb-4">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <span className="eyebrow text-emerald-800">Your Active Volunteer Pledge</span>
              <h3 className="font-bold text-base text-emerald-950 mt-0.5">
                {activePledge.assetType} ({activePledge.capacity})
              </h3>
              <p className="text-xs text-emerald-700 mt-1">
                Submitted by <strong>{activePledge.volunteerName}</strong> ({activePledge.contactPhone}) at {activePledge.locationName}.
              </p>
            </div>
            <span
              className={`adm-status text-xs font-bold ${
                activePledge.status === "mobilized"
                  ? "adm-status--green"
                  : activePledge.status === "approved_by_head"
                  ? "adm-status--blue"
                  : activePledge.status === "assigned_by_admin"
                  ? "adm-status--amber"
                  : "adm-status--mute"
              }`}
            >
              {activePledge.status === "mobilized"
                ? "⚡ Mobilized to Scene"
                : activePledge.status === "approved_by_head"
                ? "✓ Approved by Team Head"
                : activePledge.status === "assigned_by_admin"
                ? "👑 Assigned to Rescue Team Base"
                : "⏳ Awaiting Command Match"}
            </span>
          </div>

          {/* Assigned Rescue Team Banner */}
          {activePledge.assignedTeamName && (
            <div className="p-3 bg-purple-100 border border-purple-300 rounded text-xs text-purple-950 font-medium">
              <span className="font-bold flex items-center gap-1.5 text-purple-900 mb-0.5">
                <Crown size={14} className="text-amber-600" /> Assigned Rescue Team Base:
              </span>
              <p className="font-bold text-sm text-purple-950">{activePledge.assignedTeamName}</p>
              <p className="text-[11px] text-purple-800 mt-1">
                The Rescue Team Head has been provided with your direct phone number ({activePledge.contactPhone}) for local mobilization.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
            <span className="text-[11px] text-emerald-800">
              You can cancel this pledge anytime before it gets mobilized.
            </span>
            <button
              type="button"
              onClick={handleCancelPledge}
              disabled={cancellingPledge}
              className="adm-btn adm-btn--danger text-xs font-bold"
            >
              <X size={14} />
              {cancellingPledge ? "Cancelling Pledge..." : "Cancel Volunteer Pledge"}
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="adm-note" style={{ borderLeftColor: "var(--c-green)", marginBottom: 16 }}>
          <CheckCircle2 size={16} style={{ color: "var(--c-green)" }} />
          <span>
            Pledge registered. Your {service} is in the response pool and will be recommended to the
            regional rescue lead for nearby incidents.{" "}
            <Link href="/citizen/history" style={{ color: "var(--c-accent-ink)", fontWeight: 700 }}>
              Track status →
            </Link>
          </span>
        </div>
      )}

      {error && (
        <div className="adm-note" style={{ borderLeftColor: "var(--c-red)", marginBottom: 16 }}>
          <span>{error}</span>
        </div>
      )}

      <form
        className="adm-card"
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 14,
          opacity: activeSos ? 0.6 : 1,
          pointerEvents: activeSos ? "none" : "auto",
        }}
      >
        <div style={{ paddingBottom: 14, borderBottom: "1px solid var(--c-hairline)" }}>
          <p className="eyebrow">Offer assets</p>
          <h2 className="section-title">What can you contribute?</h2>
        </div>

        <div className="cz-form-grid">
          <label className="adm-field">
            <span>Name / organisation</span>
            <input
              name="name"
              required
              placeholder="Rahul Sharma / Local Fishermen Union"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="adm-field">
            <span>Contact</span>
            <input
              name="contact"
              placeholder="+91 98765 43210"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </label>

          <label className="adm-field">
            <span>Asset / skill</span>
            <select name="service" value={service} onChange={(e) => setService(e.target.value)}>
              <option value="boat">Inflatable boat / motorboat</option>
              <option value="4x4 Vehicle">4x4 transport</option>
              <option value="food_water">Water / food packets</option>
              <option value="medical">First aid kit &amp; paramedic skill</option>
              <option value="shelter">Hall / shelter space</option>
            </select>
          </label>

          <label className="adm-field">
            <span>Capacity</span>
            <input
              name="capacity"
              type="number"
              min="1"
              placeholder="Persons or units"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>

          <label className="adm-field cz-span">
            <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MapPin size={13} /> Base location
              </span>
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={gpsLoading}
                className="adm-btn"
                style={{ marginLeft: "auto", textTransform: "none", flexShrink: 0 }}
              >
                <Navigation size={13} />
                {gpsLoading ? "Detecting…" : "Use current location"}
              </button>
            </span>
            <input
              name="location"
              required
              placeholder="District or landmark"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div className="adm-kv">
            <span>Region</span>
            <strong>{regionName}</strong>
          </div>
          <div className="adm-kv">
            <span>Coordinates</span>
            <strong style={{ fontFamily: "ui-monospace, monospace" }}>
              {lat}, {lng}
            </strong>
          </div>
        </div>

        <div className="adm-note">
          <span>
            Pledges route directly to the <strong>regional rescue lead</strong> for mobilisation, not
            central administration.
          </span>
        </div>

        <button
          className={`adm-btn ${hasActiveSos ? "adm-btn--danger opacity-50 cursor-not-allowed" : "adm-btn--primary"}`}
          type="submit"
          disabled={loading || hasActiveSos}
          style={{ width: "max-content" }}
        >
          <Send size={14} />
          {hasActiveSos ? "Pledging Blocked (Cancel Active SOS First)" : loading ? "Registering…" : "Pledge resource"}
        </button>
      </form>
    </>
  );
}