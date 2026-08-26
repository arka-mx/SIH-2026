import { ReactNode } from "react";
import { CitizenHeader } from "@/components/citizen/CitizenHeader";
import { CitizenNavigation } from "@/components/citizen/CitizenNavigation";

export function CitizenShell({ children }: { children: ReactNode }) {
  return <div className="citizen-app"><CitizenHeader /><div className="citizen-frame"><CitizenNavigation /><main className="citizen-main">{children}</main></div></div>;
}