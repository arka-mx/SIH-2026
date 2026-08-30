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
  X,
} from "lucide-react";

interface RescuerNavigationProps {
  rescuerId: string;
  isTeamHead: boolean;
  activeTab: string;
  onTabChange?: (tab: string) => void;
  onToggleRole?: (head: boolean) => void;
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

function RoleSwitch({
  isTeamHead,
  onToggleRole,
}: {
  isTeamHead: boolean;
  onToggleRole?: (head: boolean) => void;
}) {
  return (
    <div className="adm-segment w-full">
      <button
        type="button"
        data-active={isTeamHead}
        onClick={() => onToggleRole?.(true)}
        className="flex-1"
      >
        Head
      </button>
      <button
        type="button"
        data-active={!isTeamHead}
        onClick={() => onToggleRole?.(false)}
        className="flex-1"
      >
        Member
      </button>
    </div>
  );
}

export function RescuerNavigation({
  isTeamHead,
  activeTab,
  onTabChange,
  onToggleRole,
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
        <div className="mb-3">
          <span className="eyebrow block mb-2">Role</span>
          <RoleSwitch isTeamHead={isTeamHead} onToggleRole={onToggleRole} />
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
          <div className="p-3 mb-1">
            <span className="eyebrow block mb-2">Role</span>
            <RoleSwitch
              isTeamHead={isTeamHead}
              onToggleRole={(head) => {
                onToggleRole?.(head);
                onCloseMobile?.();
              }}
            />
          </div>
          {links(onCloseMobile)}
        </nav>
      </div>
    </>
  );
}
