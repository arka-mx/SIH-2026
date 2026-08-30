"use client";

import { useState, FormEvent } from "react";
import { Send, UsersRound, CheckCircle2, MapPin, Sparkles, Navigation, Award, ShieldCheck } from "lucide-react";
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
          <p className="eyebrow">Community Resource Pool (Differentiator)</p>
          <h1>Pledge Support or Equipment</h1>
        </div>
        <span className="login-note flex items-center gap-1">
          <Sparkles size={14} className="text-emerald-600" /> Citizen-Pledged Help
        </span>
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 text-xs shadow-sm flex items-start gap-3">
          <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-sm">Community Pledge Registered!</h3>
            <p className="mt-1">
              Your pledged asset ({service}) has been added to the response coordination pool. District authorities will be recommended this resource when nearby incidents are verified.
            </p>
            <Link href="/citizen/history" className="inline-block mt-2 font-semibold text-emerald-700 underline">
              View in My Reports →
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg">
          {error}
        </div>
      )}

      <form className="citizen-form clay-panel volunteer-form" onSubmit={handleSubmit}>
        <div className="form-section-heading">
          <div>
            <p className="eyebrow">Offer Community Assets</p>
            <h2 className="section-title">What can you contribute to the rescue effort?</h2>
          </div>
          <UsersRound size={22} className="text-emerald-600" />
        </div>

        <div className="form-grid">
          <label>
            Your Name / Organization
            <input 
              name="name" 
              required 
              placeholder="e.g. Rahul Sharma / Local Fishermen Union" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label>
            Contact Phone / Radio
            <input 
              name="contact" 
              placeholder="+91 98765 43210" 
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </label>

          <label>
            Pledged Asset / Skill Type
            <select name="service" value={service} onChange={(e) => setService(e.target.value)}>
              <option value="boat">Inflatable Boat / Motorboat (Floods)</option>
              <option value="4x4 Vehicle">4x4 Offroad Transport (Landslides / Evacuation)</option>
              <option value="food_water">Spare Clean Water / Food Packets</option>
              <option value="medical">Medical First Aid Kit & Paramedic Skill</option>
              <option value="shelter">Private Hall / Community Shelter Space</option>
            </select>
          </label>

          <label>
            Capacity (Persons / Units)
            <input 
              name="capacity" 
              type="number" 
              min="1" 
              placeholder="e.g. 6 persons or 50 water bottles"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>

          <div className="col-span-full p-4 bg-emerald-50/90 rounded-2xl border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                <MapPin size={15} className="text-emerald-600" /> Base Location & Sector GPS
              </label>
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={gpsLoading}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Navigation size={13} className={gpsLoading ? "animate-spin" : ""} />
                {gpsLoading ? "Detecting Location..." : "Select Current Location"}
              </button>
            </div>

            <div className="input-with-icon bg-white rounded-xl border border-stone-300">
              <MapPin size={16} className="text-stone-400" />
              <input 
                name="location" 
                required 
                placeholder="District or Landmark (Auto-filled by Select Current Location)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full py-2 text-xs font-semibold text-stone-800 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-stone-700">
                Latitude
                <input 
                  name="lat" 
                  required 
                  type="number" 
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full mt-1 p-2 bg-white rounded-lg border border-stone-300 font-mono text-xs"
                />
              </label>
              <label className="text-xs font-bold text-stone-700">
                Longitude
                <input 
                  name="lng" 
                  required 
                  type="number" 
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full mt-1 p-2 bg-white rounded-lg border border-stone-300 font-mono text-xs"
                />
              </label>
            </div>

            <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl space-y-1 text-xs text-purple-950">
              <div className="flex items-center gap-1 font-bold text-purple-900">
                <Award size={14} className="text-purple-600" />
                <span>Region Jurisdiction: <strong>{regionName}</strong></span>
              </div>
              <p className="text-[11px] text-purple-800 flex items-center gap-1 font-medium">
                <ShieldCheck size={13} className="text-purple-600" />
                Direct Routing: Volunteer requests go directly to the <strong>Rescue Team Head</strong> for regional mobilization (Not central administration).
              </p>
            </div>
          </div>
        </div>

        <button 
          className="form-submit citizen-submit flex items-center justify-center gap-2" 
          type="submit"
          disabled={loading}
        >
          <Send size={16} /> 
          {loading ? "Registering Resource..." : "Pledge Community Resource"}
        </button>
      </form>
    </>
  );
}