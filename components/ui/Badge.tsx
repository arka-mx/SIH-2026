import { ReactNode } from "react";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "red" | "amber" }) {
  const tones = { neutral: "bg-[#edf2e7] text-[#516253]", green: "bg-[#dff0df] text-[#27704d]", red: "bg-[#ffe0dc] text-[#a52c26]", amber: "bg-[#fff0ca] text-[#8b6418]" };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${tones[tone]}`}>{children}</span>;
}
