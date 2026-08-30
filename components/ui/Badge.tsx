import { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "red" | "amber";
}) {
  const tones = {
    neutral: "text-slate-600 border-slate-300",
    green: "text-green-700 border-green-300",
    red: "text-red-700 border-red-300",
    amber: "text-amber-700 border-amber-300",
  };
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.09em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
