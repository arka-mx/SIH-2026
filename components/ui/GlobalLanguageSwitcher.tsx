"use client";

import { usePathname } from "next/navigation";
import { LanguageSelect } from "@/components/ui/LanguageSelect";

/**
 * Floating top-right language switcher, mounted globally in the root layout.
 *
 * It is hidden on the few screens that already dock the switcher inside their
 * own header (the authenticated dashboards), so it never overlaps existing
 * top-right chrome. Everywhere else — landing, login screens, safety pages,
 * citizen sub-pages — it provides the same control in the same corner.
 */
export function GlobalLanguageSwitcher() {
  const pathname = usePathname() || "/";

  const dockedInHeader =
    pathname === "/citizen" ||
    (pathname.startsWith("/admin/") && pathname !== "/admin/login") ||
    pathname === "/admin" ||
    (pathname.startsWith("/rescuer/") && pathname !== "/rescuer/login");

  if (dockedInHeader) return null;

  return (
    <div className="lang-fab">
      <LanguageSelect variant="compact" label="Language" />
    </div>
  );
}
