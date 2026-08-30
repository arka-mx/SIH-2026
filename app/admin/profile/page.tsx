import { Building2, ShieldCheck, UserRound } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { AdminLocationField } from "@/components/admin/AdminLocationField";

const details = [
  { label: "Admin name", value: "Aarav Sen", icon: UserRound },
  { label: "Role", value: "District Response Coordinator", icon: ShieldCheck },
  { label: "Department", value: "Odisha State Disaster Management Authority", icon: Building2 },
];

export default function ProfilePage() {
  return (
    <AdminShell>
      <div className="page-heading">
        <h1>Profile</h1>
      </div>

      <Card>
        <div className="profile-panel">
          <div className="profile-avatar">
            <UserRound size={26} />
          </div>
          <div>
            <h2 className="section-title">Aarav Sen</h2>
            <p className="login-note">Administrator</p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {details.map(({ label, value, icon: Icon }) => (
            <div key={label} className="border border-slate-200 bg-slate-50 p-4">
              <Icon size={16} className="mb-3 text-[color:var(--a-accent)]" />
              <p className="eyebrow">{label}</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
            </div>
          ))}
          <AdminLocationField />
        </div>
      </Card>
    </AdminShell>
  );
}
