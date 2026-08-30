"use client";

import { ReactNode, useState } from "react";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Navigation } from "@/components/layout/Navigation";

export function AdminShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="admin-shell">
      <AdminHeader
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((v) => !v)}
      />
      <div className="admin-frame">
        <Navigation
          mobileOpen={menuOpen}
          onCloseMobile={() => setMenuOpen(false)}
        />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
