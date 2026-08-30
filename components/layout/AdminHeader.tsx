"use client";

import Link from "next/link";
import { House, ShieldCheck, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { WeatherWidget } from "@/components/ui/WeatherWidget";

export function AdminHeader() {
  const router = useRouter();

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/admin/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  return (
    <header className="admin-header">
      <span className="brand-chip">
        <ShieldCheck size={18} /> MOMENTUM
      </span>
      <div className="hidden text-center text-[14px] font-extrabold tracking-[0.2em] text-[#49614d] sm:block">
        DISASTER RESPONSE COMMAND CENTER
      </div>
      <div className="flex items-center gap-3">
        {/* Mumbai Emergency command weather cache feed */}
        <WeatherWidget lat={19.0760} lng={72.8777} />
        
        <Link href="/" className="brand-chip" aria-label="Go to home">
          <House size={16} /> HOME
        </Link>
        <button onClick={handleLogout} className="brand-chip cursor-pointer bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 flex items-center gap-1.5" aria-label="Logout">
          <LogOut size={14} /> LOGOUT
        </button>
        <span className="brand-chip bg-[#eae1cc]">CMD</span>
      </div>
    </header>
  );
}
