"use client";

import { useRouter } from "next/navigation";
import { LanguageSelect } from "@/components/ui/LanguageSelect";
import { UserCheck } from "lucide-react";

interface RescuerHeaderProps {
  currentRescuerId: string;
  rescuerName?: string;
  status?: string;
}

export function RescuerHeader({
  currentRescuerId,
  rescuerName = "NDRF Rescue Unit",
}: RescuerHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/rescuer-logout", { method: "POST" });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        router.push(data.redirect || "/");
        router.refresh();
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  return (
    <header className="admin-topbar">
      <div className="flex items-center gap-3 min-w-0">
        <span className="admin-topbar__title">Rescuer Field Portal</span>
        <span className="hidden md:inline-flex items-center gap-1.5 border border-slate-300 px-2.5 py-1 text-[11px]">
          <UserCheck size={13} className="text-[color:var(--a-accent)]" />
          <span className="text-slate-500 font-semibold">Unit</span>
          <span className="text-slate-900 font-bold truncate">{rescuerName}</span>
          <span className="text-slate-400 font-mono">({currentRescuerId})</span>
        </span>
      </div>

      <div className="admin-topbar__actions">
        <LanguageSelect variant="compact" />
        <button
          type="button"
          onClick={handleLogout}
          className="admin-chip admin-chip--danger"
          aria-label="Log out"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
