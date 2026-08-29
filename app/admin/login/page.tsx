"use client";

import { FormEvent } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/components/public/PublicHeader";

export default function AdminLoginPage() {
  const router = useRouter();
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/admin");
  }
  return <main className="public-home"><PublicHeader /><section className="access-form-layout"><div><p className="hero-kicker">Secure operations access</p><h1>Welcome, coordinator.</h1><p>Enter your district details to open the command center.</p></div><form className="access-form" onSubmit={handleSubmit}><div className="form-icon"><ShieldCheck size={24} /></div><h2>Admin access</h2><label htmlFor="admin-name">Name<input id="admin-name" name="name" required placeholder="Your full name" /></label><label htmlFor="admin-id">Access ID<input id="admin-id" name="id" required placeholder="District or officer ID" /></label><label htmlFor="admin-language">Language<select id="admin-language" name="language" defaultValue="English"><option>English</option><option>Hindi</option><option>Odia</option><option>Bengali</option><option>Telugu</option></select></label><button className="form-submit" type="submit">Open admin dashboard <ArrowRight size={17} /></button></form></section></main>;
}