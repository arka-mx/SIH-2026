"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  Eye,
  PackagePlus,
  UsersRound,
  HardHat,
  Crown,
  Package,
  Shield,
  Layers,
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

export function RescuerNavigation({
  rescuerId,
  isTeamHead,
  activeTab,
  onTabChange,
  onToggleRole,
  mobileOpen = false,
  onCloseMobile,
}: RescuerNavigationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Close mobile drawer on tab change
  useEffect(() => {
    onCloseMobile?.();
  }, [activeTab, isTeamHead]);

  // Head Navigation Items
  const headItems = [
    { id: "overview", label: "Dashboard & Dispatch", icon: LayoutDashboard },
    { id: "disasters", label: "Disaster Radar (Read-Only)", icon: Eye },
    { id: "district-head", label: "District Head Connection", icon: Radio, badge: "Exclusive" },
    { id: "allocate", label: "Ration & Resource Allocation", icon: PackagePlus },
    { id: "volunteers", label: "Volunteer Pool", icon: UsersRound },
    { id: "supplies", label: "Supply Inventory", icon: Package },
  ];

  // Member Navigation Items
  const memberItems = [
    { id: "member-portal", label: "My Orders & Requirements", icon: HardHat },
    { id: "member-supplies", label: "Unit Supply Inventory", icon: Package },
  ];

  const currentItems = isTeamHead ? headItems : memberItems;

  return (
    <>
      <aside className="sidebar">
        {/* Role Indicator & Mode Switcher */}
        <div className="p-2.5 mb-2 bg-white border border-[#d2ae82] rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider flex items-center gap-1">
            {isTeamHead ? <Crown size={12} className="text-amber-600" /> : <HardHat size={12} className="text-[#115e59]" />}
            Active Role
          </span>
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => onToggleRole && onToggleRole(true)}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                isTeamHead
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Team Head
            </button>
            <button
              type="button"
              onClick={() => onToggleRole && onToggleRole(false)}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                !isTeamHead
                  ? "bg-[#115e59] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Field Member
            </button>
          </div>
        </div>

        {/* Navigation Tab Links */}
        <div className="space-y-1">
          {currentItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange && onTabChange(item.id)}
                className={`w-full text-left nav-link cursor-pointer flex items-center justify-between ${
                  isActive ? "active font-bold" : ""
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={16} />
                  <span>{item.label}</span>
                </span>
                {item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500 text-white rounded-sm">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Mobile Drawer */}
      <div
        className={`admin-drawer ${mobileOpen ? "is-open" : ""}`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className="admin-drawer__backdrop"
          aria-label="Close menu"
          tabIndex={mobileOpen ? 0 : -1}
          onClick={onCloseMobile}
        />
        <nav className="admin-drawer__panel" aria-label="Rescuer navigation">
          <div className="admin-drawer__head">
            <span className="admin-drawer__title">Rescue Unit Menu</span>
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

          <div className="p-3 mb-2 bg-slate-50 border border-slate-200 rounded-none space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500">Role Designation</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onToggleRole && onToggleRole(true);
                  onCloseMobile?.();
                }}
                className={`flex-1 py-1.5 text-xs font-bold ${
                  isTeamHead ? "bg-amber-600 text-white" : "bg-white border text-slate-700"
                }`}
              >
                Team Head
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleRole && onToggleRole(false);
                  onCloseMobile?.();
                }}
                className={`flex-1 py-1.5 text-xs font-bold ${
                  !isTeamHead ? "bg-[#115e59] text-white" : "bg-white border text-slate-700"
                }`}
              >
                Field Member
              </button>
            </div>
          </div>

          {currentItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onTabChange && onTabChange(item.id);
                  onCloseMobile?.();
                }}
                className={`w-full text-left nav-link cursor-pointer ${isActive ? "active" : ""}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
