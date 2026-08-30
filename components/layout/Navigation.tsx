"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleUserRound,
  ClipboardCheck,
  FileWarning,
  Package,
  UsersRound,
  Truck,
  ShieldAlert,
  Printer,
  X,
} from "lucide-react";

const items = [
  { href: "/admin", label: "Dashboard", icon: CircleUserRound },
  { href: "/admin/permissions", label: "Auto-alerts", icon: ShieldAlert },
  { href: "/admin/verified", label: "Verified", icon: ClipboardCheck },
  { href: "/admin/unverified", label: "Unverified", icon: FileWarning },
  { href: "/admin/volunteers", label: "Pledges", icon: UsersRound },
  { href: "/admin/resources", label: "Resources", icon: Package },
  { href: "/admin/posters", label: "Posters", icon: Printer },
  { href: "/rescuer/demo-team-alpha", label: "Field", icon: Truck },
];

export function Navigation({
  mobileOpen = false,
  onCloseMobile,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  useEffect(() => {
    onCloseMobile?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // While the drawer is open: lock body scroll and allow Escape to close.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMobile?.();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen, onCloseMobile]);

  const links = items.map(({ href, label, icon: Icon }) => (
    <Link
      key={href}
      href={href}
      className={`nav-link ${pathname === href ? "active" : ""}`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  ));

  return (
    <>
      <aside className="sidebar">{links}</aside>

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
        <nav className="admin-drawer__panel" aria-label="Admin navigation">
          <div className="admin-drawer__head">
            <span className="admin-drawer__title">Command Center</span>
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
          {links}
        </nav>
      </div>
    </>
  );
}
