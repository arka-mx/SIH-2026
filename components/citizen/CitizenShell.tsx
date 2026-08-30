"use client";

import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { CitizenNavigation } from "@/components/citizen/CitizenNavigation";
import { LanguageSelect } from "@/components/ui/LanguageSelect";

export function CitizenShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="citizen-shell">
      <header className="citizen-topbar">
        <div className="citizen-topbar__lead">
          <button
            type="button"
            className="citizen-topbar__menu"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Menu size={18} />
          </button>
          <span className="citizen-topbar__title">Citizen Desk</span>
        </div>
        <div className="citizen-topbar__actions">
          <LanguageSelect variant="compact" />
        </div>
      </header>
      <div className="citizen-frame">
        <CitizenNavigation
          mobileOpen={menuOpen}
          onCloseMobile={() => setMenuOpen(false)}
        />
        <main className="citizen-main">{children}</main>
      </div>
    </div>
  );
}
