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
  MapPin,
  X,
  Compass
} from "lucide-react";

interface WeatherWidgetProps {
  lat: number;
  lng: number;
}

interface WeatherInfo {
  temp: number;
  windspeed: number;
  weathercode: number;
  cached?: boolean;
}

export function WeatherWidget({ lat, lng }: WeatherWidgetProps) {
  const [activeLat, setActiveLat] = useState(lat);
  const [activeLng, setActiveLng] = useState(lng);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [inputLat, setInputLat] = useState(lat.toString());
  const [inputLng, setInputLng] = useState(lng.toString());

  useEffect(() => {
    setActiveLat(lat);
    setActiveLng(lng);
    setInputLat(lat.toFixed(4));
    setInputLng(lng.toFixed(4));
  }, [lat, lng]);

  useEffect(() => {
    async function fetchWeather() {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch(`/api/weather?lat=${activeLat}&lng=${activeLng}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setWeather(data);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    if (activeLat && activeLng) {
      fetchWeather();
    }
  }, [activeLat, activeLng]);

  function handleUpdateCoordinates(e: React.FormEvent) {
    e.preventDefault();
    const parseLat = parseFloat(inputLat);
    const parseLng = parseFloat(inputLng);
    if (!isNaN(parseLat) && !isNaN(parseLng)) {
      setActiveLat(parseLat);
      setActiveLng(parseLng);
      setShowPopover(false);
    }
  }

  function getWeatherCondition(code: number) {
    if (code === 0) return { label: "Clear Sky", icon: <Sun size={14} className="text-amber-500 animate-spin-slow" /> };
    if (code >= 1 && code <= 3) return { label: "Partly Cloudy", icon: <CloudSun size={14} className="text-stone-500" /> };
    if (code === 45 || code === 48) return { label: "Foggy", icon: <Cloud size={14} className="text-stone-400" /> };
    if (code >= 51 && code <= 55) return { label: "Drizzle", icon: <CloudDrizzle size={14} className="text-blue-400" /> };
    if (code >= 61 && code <= 65) return { label: "Rain", icon: <CloudRain size={14} className="text-blue-500" /> };
    if (code >= 71 && code <= 75) return { label: "Snow", icon: <Snowflake size={14} className="text-cyan-300" /> };
    if (code >= 80 && code <= 82) return { label: "Showers", icon: <CloudRain size={14} className="text-blue-500" /> };
    if (code >= 95) return { label: "Thunderstorm", icon: <CloudLightning size={14} className="text-amber-600" /> };
    return { label: "Overcast", icon: <Cloud size={14} className="text-stone-500" /> };
  }

  if (loading && !weather) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-300 px-2.5 py-1">
        <span className="w-1.5 h-1.5 bg-slate-400" />
        Loading…
      </div>
    );
  }

  const cond = weather ? getWeatherCondition(weather.weathercode) : { label: "Overcast", icon: <Cloud size={14} className="text-stone-500" /> };

  return (
    <div className="relative">
      <div 
        onClick={() => setShowPopover(!showPopover)}
        className="flex items-center gap-2.5 text-[11px] font-bold text-slate-700 bg-white border border-slate-300 px-3 py-1.5 cursor-pointer hover:bg-slate-50 transition-all select-none"
        title={`Click to inspect or change monitoring coordinate (${activeLat.toFixed(4)}, ${activeLng.toFixed(4)})`}
      >
        <span className="flex items-center gap-1">
          {cond.icon}
          <span className="hidden xs:inline">{cond.label}</span>
        </span>
        <span className="w-px h-3 bg-stone-300" />
        <span className="flex items-center gap-0.5 text-stone-800">
          <Thermometer size={13} className="text-red-500" />
          {weather ? weather.temp : "--"}°C
        </span>
        <span className="w-px h-3 bg-stone-300" />
        <span className="flex items-center gap-0.5 text-stone-600 hidden sm:flex">
          <Wind size={13} className="text-blue-400" />
          {weather ? weather.windspeed : "--"} km/h
        </span>
      </div>

      {showPopover && (
        <div className="absolute right-0 mt-2 w-64 bg-white text-stone-900 border border-stone-200 rounded-xl shadow-lg p-4 z-50 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
              <Compass size={14} className="text-emerald-600 animate-spin-slow" /> Sector Weather Monitor
            </span>
            <button 
              onClick={() => setShowPopover(false)} 
              className="text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="text-[11px] space-y-1.5 text-stone-600 leading-normal">
            <p className="flex items-center gap-1">
              <MapPin size={12} className="text-rose-500" /> 
              Monitoring: <strong>({activeLat.toFixed(4)}, {activeLng.toFixed(4)})</strong>
            </p>
            <p className="bg-slate-50 p-2 border border-slate-200 text-[10px]">
              <i>Caching policy:</i> fetches from Open-Meteo and reuses any reading within 2&nbsp;km taken in the last 30 minutes.
            </p>
          </div>

          <form onSubmit={handleUpdateCoordinates} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-bold text-stone-500">
                Latitude:
                <input
                  type="number"
                  step="0.0001"
                  value={inputLat}
                  onChange={(e) => setInputLat(e.target.value)}
                  className="w-full mt-1 bg-stone-50 border border-stone-200 text-xs px-2 py-1 rounded outline-none text-stone-800 font-mono"
                  required
                />
              </label>
              <label className="text-[10px] font-bold text-stone-500">
                Longitude:
                <input
                  type="number"
                  step="0.0001"
                  value={inputLng}
                  onChange={(e) => setInputLng(e.target.value)}
                  className="w-full mt-1 bg-stone-50 border border-stone-200 text-xs px-2 py-1 rounded outline-none text-stone-800 font-mono"
                  required
                />
              </label>
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Update Sector Monitor
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
