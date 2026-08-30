"use client";

import { useEffect, useState } from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudDrizzle,
  Snowflake,
  Wind,
  Thermometer,
} from "lucide-react";

interface WeatherWidgetProps {
  lat: number;
  lng: number;
}

interface WeatherInfo {
  temp: number;
  windspeed: number;
  weathercode: number;
}

export function WeatherWidget({ lat, lng }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  // On load, prefer the device's real location; the props are the fallback.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      undefined,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  }, []);

  const coords = geo ?? { lat, lng };

  useEffect(() => {
    async function fetchWeather() {
      try {
        setLoading(true);
        const res = await fetch(`/api/weather?lat=${coords.lat}&lng=${coords.lng}`);
        if (!res.ok) throw new Error();
        setWeather(await res.json());
      } catch {
        setWeather(null);
      } finally {
        setLoading(false);
      }
    }
    if (coords.lat && coords.lng) fetchWeather();
  }, [coords.lat, coords.lng]);

  function getCondition(code: number) {
    if (code === 0) return { label: "Clear", icon: <Sun size={14} className="text-amber-500" /> };
    if (code <= 3) return { label: "Partly cloudy", icon: <CloudSun size={14} className="text-slate-500" /> };
    if (code === 45 || code === 48) return { label: "Fog", icon: <Cloud size={14} className="text-slate-400" /> };
    if (code <= 55) return { label: "Drizzle", icon: <CloudDrizzle size={14} className="text-blue-400" /> };
    if (code <= 65) return { label: "Rain", icon: <CloudRain size={14} className="text-blue-500" /> };
    if (code <= 75) return { label: "Snow", icon: <Snowflake size={14} className="text-cyan-400" /> };
    if (code <= 82) return { label: "Showers", icon: <CloudRain size={14} className="text-blue-500" /> };
    if (code >= 95) return { label: "Storm", icon: <CloudLightning size={14} className="text-amber-600" /> };
    return { label: "Overcast", icon: <Cloud size={14} className="text-slate-500" /> };
  }

  if (loading && !weather) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-300 px-2.5 py-1.5">
        Weather…
      </div>
    );
  }

  if (!weather) return null;

  const cond = getCondition(weather.weathercode);

  return (
    <div
      className="flex items-center gap-2.5 text-[11px] font-bold text-slate-700 bg-white border border-slate-300 px-3 py-1.5 select-none"
      title={`Conditions at your location (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})`}
    >
      <span className="flex items-center gap-1">
        {cond.icon}
        <span className="hidden sm:inline">{cond.label}</span>
      </span>
      <span className="w-px h-3 bg-slate-300" />
      <span className="flex items-center gap-1 text-slate-800">
        <Thermometer size={13} className="text-red-500" />
        {weather.temp}°C
      </span>
      <span className="w-px h-3 bg-slate-300" />
      <span className="flex items-center gap-1 text-slate-600">
        <Wind size={13} className="text-blue-400" />
        {weather.windspeed} km/h
      </span>
    </div>
  );
}
