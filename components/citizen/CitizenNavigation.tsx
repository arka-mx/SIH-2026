"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FileWarning, History, UserRound, HandHeart, Home, X } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/citizen", label: "Report", icon: FileWarning },
  { href: "/citizen/volunteer", label: "Pledge", icon: HandHeart },
  { href: "/citizen/history", label: "Status", icon: History },
  { href: "/citizen/profile", label: "Profile", icon: UserRound },
  { href: "/", label: "Home", icon: Home },
];

export function CitizenNavigation({
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
      <aside className="citizen-sidebar">{links}</aside>

      <div
        className={`citizen-drawer ${mobileOpen ? "is-open" : ""}`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className="citizen-drawer__backdrop"
          aria-label="Close menu"
          tabIndex={mobileOpen ? 0 : -1}
          onClick={onCloseMobile}
        />
        <nav className="citizen-drawer__panel" aria-label="Citizen navigation">
          <div className="citizen-drawer__head">
            <span className="citizen-drawer__title">Citizen Desk</span>
            <button
              type="button"
              className="citizen-drawer__close"
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
