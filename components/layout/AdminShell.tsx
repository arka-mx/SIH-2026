import { ReactNode } from "react";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Navigation } from "@/components/layout/Navigation";

export function AdminShell({ children }: { children: ReactNode }) {
  return <><AdminHeader /><div className="admin-frame"><Navigation /><main className="admin-main">{children}</main></div></>;
}
