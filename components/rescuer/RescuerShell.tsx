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
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col font-sans">
      <RescuerHeader
        currentRescuerId={rescuerId}
        rescuerName={rescuerName}
        status={status}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {children}
      </main>
    </div>
  );
}
