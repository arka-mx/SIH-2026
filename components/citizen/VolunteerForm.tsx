"use client";

import { useState, FormEvent } from "react";
import { Send, CheckCircle2, MapPin, Navigation } from "lucide-react";
import { apiReverseGeocodeDetailed, apiSubmitVolunteerRequest } from "@/lib/api";
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
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await apiSubmitVolunteerRequest({
        volunteerName: name,
        contactPhone: contact || "+91 98765 00000",
        assetType: service,
        capacity,
        availability,
        locationName: location,
        region: regionName,
        lat: parseFloat(lat) || 19.0760,
        lng: parseFloat(lng) || 72.8777,
      });

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

      <form className="adm-card" onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
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
          className="adm-btn adm-btn--primary"
          type="submit"
          disabled={loading}
          style={{ width: "max-content" }}
        >
          <Send size={14} />
          {loading ? "Registering…" : "Pledge resource"}
        </button>
      </form>
    </>
  );
}