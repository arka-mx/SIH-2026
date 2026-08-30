"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({ label = "Back" }: { label?: string }) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <div className="public-backbar">
      <button type="button" className="back-button" onClick={handleBack}>
        <ArrowLeft size={16} />
        <span>{label}</span>
      </button>
    </div>
  );
}
