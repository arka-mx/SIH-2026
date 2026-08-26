import Link from "next/link";
import { House, ShieldCheck } from "lucide-react";

export function AdminHeader() {
  return <header className="admin-header"><span className="brand-chip"><ShieldCheck size={18} /> MOMENTUM</span><div className="hidden text-center text-[14px] font-extrabold tracking-[0.2em] text-[#49614d] sm:block">DISASTER RESPONSE COMMAND CENTER</div><div className="flex items-center gap-2"><Link href="/" className="brand-chip" aria-label="Go to home"><House size={16} /> HOME</Link><span className="brand-chip">SIH</span></div></header>;
}
