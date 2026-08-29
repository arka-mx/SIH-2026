import Link from "next/link";
import { ArrowRight, Languages, ShieldCheck, UsersRound, Truck } from "lucide-react";

export default function Home() {
  return (
    <main className="public-home">
      <header className="public-header">
        <div className="public-brand">
          <ShieldCheck size={25} />
          <span>MOMENTUM</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="home-button">
            <span>HOME</span>
          </Link>
          <div className="sih-mark">
            <span className="logo-box">SIH</span>
          </div>
        </div>
      </header>

      <section className="home-hero">
        <div className="home-copy">
          <p className="hero-kicker">Community Response Network</p>
          <h1>Disaster Response Command Center</h1>
          <p>
            Report emergencies, coordinate rescue units & field supplies, and keep your district connected when every second matters.
          </p>

          <div className="language-picker">
            <Languages size={17} />
            <label htmlFor="language">Preferred language</label>
            <select id="language" defaultValue="English">
              <option>English</option>
              <option>Hindi</option>
              <option>Odia</option>
              <option>Bengali</option>
              <option>Telugu</option>
            </select>
          </div>
        </div>

        <div className="access-panel">
          <p className="eyebrow">Choose your workspace</p>
          <h2>How are you joining today?</h2>

          <div className="access-options">
            <Link href="/admin/login" className="access-button admin-access">
              <ShieldCheck size={22} />
              <span>
                <strong>Admin Command Access</strong>
                <small>Triage reports, verify clusters & dispatch resources</small>
              </span>
              <ArrowRight size={18} />
            </Link>

            <Link href="/rescuer/demo-team-alpha" className="access-button !border-emerald-600 hover:!bg-emerald-50">
              <Truck size={22} className="text-emerald-600" />
              <span>
                <strong>Rescuer Field Portal</strong>
                <small>Track supplies, shelters & auto-nearest disaster handoff</small>
              </span>
              <ArrowRight size={18} />
            </Link>

            <Link href="/citizen/login" className="access-button citizen-access">
              <UsersRound size={22} />
              <span>
                <strong>Citizen Access</strong>
                <small>Report an incident or pledge community resources</small>
              </span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
