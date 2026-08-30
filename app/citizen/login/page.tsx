"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/public/BackButton";
import { useLanguage } from "@/lib/language";

export default function CitizenLoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState(process.env.NEXT_PUBLIC_DEFAULT_CITIZEN_NAME || "Rajesh Kumar");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/citizen");
  }

  return (
    <main className="public-home theme-light">
      <BackButton />
      <section className="access-form-layout">
        <form className="access-form" onSubmit={handleSubmit}>
          <div className="form-icon citizen-icon">
            <UsersRound size={24} />
          </div>
          <h2>{t("citizenTitle", "Citizen Emergency Portal")}</h2>

          <label htmlFor="citizen-name">
            {t("username", "Your Name")}
            <input
              id="citizen-name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="mt-1"
            />
          </label>

          <button className="form-submit citizen-submit" type="submit">
            {t("submit", "Enter Citizen Portal")} <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}