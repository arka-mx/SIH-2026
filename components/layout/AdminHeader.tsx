"use client";

import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { LanguageSelect } from "@/components/ui/LanguageSelect";

export function AdminHeader({
  menuOpen = false,
  onToggleMenu,
}: {
  menuOpen?: boolean;
  onToggleMenu?: () => void;
}) {
  const router = useRouter();

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
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
        <button
          type="button"
          className="admin-topbar__menu"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={onToggleMenu}
        >
          <Menu size={18} />
        </button>
        <span className="admin-topbar__title">Command Center</span>
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
