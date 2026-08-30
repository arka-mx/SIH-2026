import { ReactNode } from "react";
import { CitizenNavigation } from "@/components/citizen/CitizenNavigation";

export function CitizenShell({ children }: { children: ReactNode }) {
  return <div className="citizen-app"><div className="citizen-frame"><CitizenNavigation /><main className="citizen-main">{children}</main></div></div>;
}