import { MapPin, UserRound } from "lucide-react";
import { CitizenShell } from "@/components/citizen/CitizenShell";

export default function CitizenProfilePage() {
  return (
    <CitizenShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Your details</p>
          <h1>Profile</h1>
        </div>
      </div>
      <section className="profile-panel adm-card">
        <div className="profile-avatar">
          <UserRound size={26} />
        </div>
        <div>
          <h2 className="section-title">Citizen profile</h2>
          <p className="login-note">Details are used only to coordinate response.</p>
        </div>
        <div className="profile-detail">
          <MapPin size={16} />
          <span>Location updates when you submit a report.</span>
        </div>
      </section>
    </CitizenShell>
  );
}
