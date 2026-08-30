import Link from "next/link";
import { House, ShieldCheck } from "lucide-react";

export function PublicHeader() {
  return <header className="public-header"><div className="public-brand"><ShieldCheck size={25} /><span>MOMENTUM</span></div><div className="flex items-center gap-2"><Link href="/" className="home-button"><House size={16} /> HOME</Link></div></header>;
}