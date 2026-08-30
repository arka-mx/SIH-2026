"use client";

import { useRouter } from "next/navigation";
import { LanguageSelect } from "@/components/ui/LanguageSelect";
import { LogOut, Menu } from "lucide-react";

interface RescuerHeaderProps {
  currentRescuerId: string;
  rescuerName?: string;
  isTeamHead?: boolean;
  status?: string;
  onOpenMobileNav?: () => void;
}

export function RescuerHeader({
  currentRescuerId,
  rescuerName = "NDRF Rescue Unit",
  isTeamHead = true,
  onOpenMobileNav,
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
      <div className="admin-topbar__lead">
        {onOpenMobileNav && (
          <button
            type="button"
            className="admin-topbar__menu"
            aria-label="Open menu"
            onClick={onOpenMobileNav}
          >
            <Menu size={18} />
          </button>
        )}
        <span className="admin-topbar__title">Field Command</span>
        <span className="hidden md:inline-flex items-center gap-2 border-l border-slate-300 pl-3 text-[11px]">
          <span className="text-slate-900 font-bold truncate">{rescuerName}</span>
          <span className="text-slate-400 font-mono">{currentRescuerId}</span>
        </span>
        <span className="adm-status adm-status--mute hidden sm:inline-flex">
          {isTeamHead ? "Team Head" : "Field Member"}
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
          <LogOut size={14} /> Log out
        </button>
      </div>
    </header>
  );
}
