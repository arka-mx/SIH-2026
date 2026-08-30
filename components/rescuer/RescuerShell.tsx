"use client";

import { ReactNode, useState } from "react";
import { RescuerHeader } from "./RescuerHeader";
import { RescuerNavigation } from "./RescuerNavigation";

interface RescuerShellProps {
  children: ReactNode;
  rescuerId: string;
  rescuerName?: string;
  status?: string;
  isTeamHead?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function RescuerShell({
  children,
  rescuerId,
  rescuerName,
  status = "available",
  isTeamHead = true,
  activeTab = "overview",
  onTabChange,
}: RescuerShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-shell">
      <RescuerHeader
        currentRescuerId={rescuerId}
        rescuerName={rescuerName}
        isTeamHead={isTeamHead}
        status={status}
        onOpenMobileNav={() => setMobileOpen(true)}
      />

      <div className="admin-frame">
        <RescuerNavigation
          rescuerId={rescuerId}
          isTeamHead={isTeamHead}
          activeTab={activeTab}
          onTabChange={onTabChange}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <main className="admin-main">
          <div className="space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
