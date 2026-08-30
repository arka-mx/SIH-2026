"use client";

import { useEffect } from "react";
import {
  LayoutDashboard,
  Radio,
  Eye,
  PackagePlus,
  UsersRound,
  HardHat,
  Package,
  Crown,
  X,
} from "lucide-react";

interface RescuerNavigationProps {
  rescuerId: string;
  isTeamHead: boolean;
  activeTab: string;
  onTabChange?: (tab: string) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const HEAD_ITEMS = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "disasters", label: "Radar", icon: Eye },
  { id: "district-head", label: "District Head", icon: Radio },
  { id: "allocate", label: "Allocate", icon: PackagePlus },
  { id: "volunteers", label: "Volunteers", icon: UsersRound },
  { id: "supplies", label: "Supplies", icon: Package },
];

const MEMBER_ITEMS = [
  { id: "member-portal", label: "My Orders", icon: HardHat },
  { id: "member-supplies", label: "Supplies", icon: Package },
];

export function RescuerNavigation({
  isTeamHead,
  activeTab,
  onTabChange,
  mobileOpen = false,
  onCloseMobile,
}: RescuerNavigationProps) {
  useEffect(() => {
    onCloseMobile?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isTeamHead]);

  const items = isTeamHead ? HEAD_ITEMS : MEMBER_ITEMS;

  const links = (onSelect?: () => void) =>
    items.map((item) => {
      const Icon = item.icon;
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            onTabChange?.(item.id);
            onSelect?.();
          }}
          className={`nav-link w-full text-left ${activeTab === item.id ? "active" : ""}`}
        >
          <Icon size={18} />
          <span>{item.label}</span>
        </button>
      );
    });

  return (
    <>
      <aside className="sidebar">
        <div className="mb-3 p-2.5 bg-slate-50 border border-slate-200 text-xs">
          <span className="eyebrow block mb-1">Designation</span>
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            {isTeamHead ? (
              <>
                <Crown size={14} className="text-amber-600" />
                <span>Team Head</span>
              </>
            ) : (
              <>
                <HardHat size={14} className="text-[#115e59]" />
                <span>Field Member</span>
              </>
            )}
          </div>
        </div>
        {links()}
      </aside>

      <div className={`admin-drawer ${mobileOpen ? "is-open" : ""}`} aria-hidden={!mobileOpen}>
        <button
          type="button"
          className="admin-drawer__backdrop"
          aria-label="Close menu"
          tabIndex={mobileOpen ? 0 : -1}
          onClick={onCloseMobile}
        />
        <nav className="admin-drawer__panel" aria-label="Rescuer navigation">
          <div className="admin-drawer__head">
            <span className="admin-drawer__title">Menu</span>
            <button
              type="button"
              className="admin-drawer__close"
              aria-label="Close menu"
              tabIndex={mobileOpen ? 0 : -1}
              onClick={onCloseMobile}
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-3 mb-1 bg-slate-50 border-b border-slate-200">
            <span className="eyebrow block mb-1">Designation</span>
            <span className="text-xs font-bold text-slate-900">
              {isTeamHead ? "Team Head" : "Field Member"}
            </span>
          </div>
          {links(onCloseMobile)}
        </nav>
      </div>
    </>
  );
}
