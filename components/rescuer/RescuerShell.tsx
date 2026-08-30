import { ReactNode } from "react";
import { RescuerHeader } from "./RescuerHeader";

interface RescuerShellProps {
  children: ReactNode;
  rescuerId: string;
  rescuerName?: string;
  status?: string;
}

export function RescuerShell({
  children,
  rescuerId,
  rescuerName,
  status = "available",
}: RescuerShellProps) {
  return (
    <div className="admin-shell">
      <RescuerHeader
        currentRescuerId={rescuerId}
        rescuerName={rescuerName}
        status={status}
      />
      <main className="rescuer-main">
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}
