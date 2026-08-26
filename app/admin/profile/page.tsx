import { Building2, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";

const details = [{ label: "Admin name", value: "Aarav Sen", icon: UserRound }, { label: "Role", value: "District Response Coordinator", icon: ShieldCheck }, { label: "Department", value: "Odisha State Disaster Management Authority", icon: Building2 }, { label: "Location", value: "Brahmapur, Odisha", icon: MapPin }];

export default function ProfilePage() {
  return <AdminShell><div className="page-heading"><div><p className="eyebrow">Workspace identity</p><h1>Admin profile</h1></div></div><Card><div className="mb-8 flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#d7e9d3] text-[#347752] shadow-inner"><UserRound size={28} /></div><div><h2 className="section-title">Aarav Sen</h2><p className="login-note">Command center administrator</p></div></div><div className="grid gap-4 sm:grid-cols-2">{details.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-[#d3e1cf] bg-[#e4eee0] p-4"><Icon size={17} className="mb-4 text-[#45805a]" /><p className="eyebrow">{label}</p><p className="mt-1 text-sm font-bold text-[#294e35]">{value}</p></div>)}</div></Card></AdminShell>;
}
