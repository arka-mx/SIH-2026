"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldAlert, 
  Truck, 
  Radio, 
  ChevronDown, 
  Activity, 
  Compass, 
  Home, 
  UserCheck 
} from "lucide-react";

interface RescuerHeaderProps {
  currentRescuerId: string;
  rescuerName?: string;
  status?: string;
}

const MOCK_RESCUER_UNITS = [
  { id: "demo-team-alpha", name: "NDRF Team Alpha (Flood & Evacuation)", type: "rescue_team" },
  { id: "res-boat-01", name: "Inflatable Boat Squad IR-1", type: "boat" },
  { id: "res-amb-102", name: "City Hospital Rapid Ambulance AMB-102", type: "ambulance" },
  { id: "res-shelter-dharavi", name: "Dharavi Community Camp Command", type: "shelter" },
];

export function RescuerHeader({
  currentRescuerId,
  rescuerName = "NDRF Rescue Unit",
  status = "available",
}: RescuerHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/rescuer-logout", { method: "POST" });
      if (res.ok) {
        router.push("/rescuer/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  function getStatusStyle(st: string) {
    switch (st) {
      case "en_route":
        return "bg-blue-600 text-white animate-pulse";
      case "at_scene":
        return "bg-amber-600 text-white";
      case "resting":
        return "bg-stone-600 text-white";
      default:
        return "bg-emerald-600 text-white";
    }
  }

  return (
    <header className="public-header !bg-stone-900 !text-white !border-stone-800 shadow-md">
      <div className="flex items-center gap-3">
        <div className="public-brand !text-emerald-400">
          <Truck size={24} className="text-emerald-400" />
          <span className="font-extrabold tracking-wider text-base text-white">RESCUER FIELD PORTAL</span>
        </div>

        {/* Static Unit label (prevents changing routes manually on frontend) */}
        <div className="hidden md:flex items-center gap-2 bg-stone-800/90 border border-stone-700 px-3 py-1.5 rounded-lg text-xs">
          <UserCheck size={14} className="text-emerald-400" />
          <span className="text-stone-400 font-medium">Unit:</span>
          <span className="text-white font-bold">{rescuerName} ({currentRescuerId})</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Status Badge */}
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${getStatusStyle(status)}`}>
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          {status.replace("_", " ")}
        </span>

        <Link
          href="/"
          className="text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
        >
          <Home size={14} /> <span className="hidden sm:inline">Home</span>
        </Link>

        <button
          onClick={handleLogout}
          className="text-xs bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer font-bold uppercase"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
