"use client";

import { useState, FormEvent } from "react";
import { Send, UsersRound, CheckCircle2, MapPin, Sparkles, Navigation } from "lucide-react";
import { apiSubmitReport } from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";
import Link from "next/link";

export function VolunteerForm() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("Mumbai Hub");
  const [lat, setLat] = useState("19.0760");
  const [lng, setLng] = useState("72.8777");
  const [service, setService] = useState("boat");
  const [availability, setAvailability] = useState("Available immediately");
  const [capacity, setCapacity] = useState("4");
  const [contact, setContact] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const sessionId = getOrCreateSessionId();
      const formData = new FormData();
      formData.append("session_id", sessionId);
      formData.append("type", "other"); // Tagged community pledge
      formData.append("lat", lat);
      formData.append("lng", lng);
      formData.append(
        "description",
        `[COMMUNITY RESOURCE PLEDGE] Pledged by: ${name} (${contact || "No phone"}). Item: ${service} (Capacity: ${capacity}). Availability: ${availability}. Location: ${location}`
      );

      await apiSubmitReport(formData);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to pledge resource";
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

          <label>
            Base Location Landmark
            <div className="input-with-icon">
              <MapPin size={16} />
              <input 
                name="location" 
                required 
                placeholder="District or Landmark"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label>
              Latitude
              <input 
                name="lat" 
                required 
                type="number" 
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </label>
            <label>
              Longitude
              <input 
                name="lng" 
                required 
                type="number" 
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </label>
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