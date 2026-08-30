"use client";

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
  Printer
} from "lucide-react";

const items = [
  { href: "/admin", label: "Dashboard", icon: CircleUserRound },
  { href: "/admin/permissions", label: "Auto-Alert Rules", icon: ShieldAlert },
  { href: "/admin/verified", label: "Verified", icon: ClipboardCheck },
  { href: "/admin/unverified", label: "Unverified", icon: FileWarning },
  { href: "/admin/volunteers", label: "Volunteers", icon: UsersRound },
  { href: "/admin/resources", label: "Resources", icon: Package },
  { href: "/admin/posters", label: "QR Posters", icon: Printer },
  { href: "/rescuer/demo-team-alpha", label: "Rescuer Field", icon: Truck },
];


export function Navigation() {
  const pathname = usePathname();
  return (
    <>
      <aside className="sidebar">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-link ${pathname === href ? "active" : ""}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </aside>
      <nav className="mobile-nav">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? "active" : ""}
          >
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
