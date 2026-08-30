"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/**
 * Keeps a public status page current without a full reload: re-runs the server
 * component on an interval and whenever the tab regains focus.
 */
export function AutoRefresh({ seconds = 45 }: { seconds?: number }) {
  const router = useRouter();
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  useEffect(() => {
    setRefreshedAt(new Date());

    function refresh() {
      router.refresh();
      setRefreshedAt(new Date());
    }

    const interval = setInterval(refresh, seconds * 1000);
    function onVisible() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, seconds]);

  return (
    <button
      type="button"
      onClick={() => {
        router.refresh();
        setRefreshedAt(new Date());
      }}
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 hover:text-stone-700"
    >
      <RefreshCw size={12} />
      Live{refreshedAt
        ? ` · updated ${refreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : ""}
    </button>
  );
}
