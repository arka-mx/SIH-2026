"use client";

import Link from "next/link";
import { FileText, History, UserRound, UsersRound } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [{ href: "/citizen", label: "Report", icon: FileText }, { href: "/citizen/volunteer", label: "Volunteer", icon: UsersRound }, { href: "/citizen/history", label: "My history", icon: History }, { href: "/citizen/profile", label: "Profile", icon: UserRound }];

export function CitizenNavigation() {
  const pathname = usePathname();
  return <><aside className="citizen-sidebar">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${pathname === href ? "active" : ""}`}><Icon size={18} /><span>{label}</span></Link>)}</aside><nav className="citizen-mobile-nav">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname === href ? "active" : ""}><Icon size={18} /><span>{label}</span></Link>)}</nav></>;
}