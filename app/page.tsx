"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, UsersRound, Truck, Info } from "lucide-react";
import { useLanguage } from "@/lib/language";

export default function Home() {
  const { t } = useLanguage();

  return (
    <main className="public-home theme-light">
      <section className="home-hero">
        <div className="home-copy">
          <p className="hero-kicker">{t("heroKicker", "Community Response Network")}</p>
          <h1>{t("title", "Disaster Response Command Center")}</h1>
          <p>{t("subtitle", "Report emergencies, coordinate rescue units & field supplies, and keep your district connected when every second matters.")}</p>
        </div>

        <div className="access-panel">
          <p className="eyebrow">{t("eyebrow", "Choose your workspace")}</p>
          <h2>{t("workspaceHeading", "How are you joining today?")}</h2>

          <div className="access-options">
            <Link href="/admin/login" className="access-button admin-access">
              <ShieldCheck size={22} />
              <span>
                <strong>{t("adminTitle", "Admin Command Access")}</strong>
                <small>{t("adminDesc", "Triage reports, verify clusters & dispatch resources")}</small>
              </span>
              <ArrowRight size={18} />
            </Link>

            <Link href="/rescuer/login" className="access-button rescuer-access">
              <Truck size={22} />
              <span>
                <strong>{t("rescuerTitle", "Rescuer Field Portal")}</strong>
                <small>{t("rescuerDesc", "Track supplies, shelters & auto-nearest disaster handoff")}</small>
              </span>
              <ArrowRight size={18} />
            </Link>

            <Link href="/citizen/login" className="access-button citizen-access">
              <UsersRound size={22} />
              <span>
                <strong>{t("citizenTitle", "Citizen Access")}</strong>
                <small>{t("citizenDesc", "Report an incident or pledge community resources")}</small>
              </span>
              <ArrowRight size={18} />
            </Link>
          </div>

          <p className="panel-note">
            <Info size={15} />
            <span>{t("panelNote", "Not sure which to choose? Contact your district disaster management office.")}</span>
          </p>
        </div>
      </section>
    </main>
  );
}
