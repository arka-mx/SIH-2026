"use client";

import { FormEvent } from "react";
import { ArrowRight, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/components/public/PublicHeader";

export default function CitizenLoginPage() {
  const router = useRouter();
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/citizen");
  }
  return <main className="public-home"><PublicHeader /><section className="access-form-layout"><div><p className="hero-kicker">Community response access</p><h1>Help your community move faster.</h1><p>Share what is happening or offer your skills to people who need support.</p></div><form className="access-form" onSubmit={handleSubmit}><div className="form-icon citizen-icon"><UsersRound size={24} /></div><h2>Citizen access</h2><label htmlFor="citizen-name">Name<input id="citizen-name" name="name" required placeholder="Your full name" /></label><label htmlFor="citizen-location">Location<input id="citizen-location" name="location" required placeholder="City, district or village" /></label><label htmlFor="citizen-language">Language<select id="citizen-language" name="language" defaultValue="English"><option>English</option><option>Hindi</option><option>Odia</option><option>Bengali</option><option>Telugu</option></select></label><button className="form-submit citizen-submit" type="submit">Enter citizen panel <ArrowRight size={17} /></button></form></section></main>;
}