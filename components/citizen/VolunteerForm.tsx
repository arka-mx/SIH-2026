"use client";

import { FormEvent } from "react";
import { Send, UsersRound } from "lucide-react";

export function VolunteerForm() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.currentTarget.reset();
  }
  return <><div className="page-heading"><div><p className="eyebrow">Community response desk</p><h1>Volunteer to help</h1></div></div><form className="citizen-form clay-panel volunteer-form" onSubmit={handleSubmit}><div className="form-section-heading"><div><p className="eyebrow">Offer support</p><h2 className="section-title">Tell us how you can help</h2></div><UsersRound size={22} /></div><div className="form-grid"><label>Name<input name="name" required placeholder="Your full name" /></label><label>Location<input name="location" required placeholder="City, district or village" /></label><label>How would you like to volunteer?<select name="service" defaultValue="Rescue support"><option>Rescue support</option><option>Medical assistance</option><option>Transport or boat</option><option>Food and supply distribution</option><option>Shelter coordination</option></select></label><label>Availability<select name="availability" defaultValue="Available now"><option>Available now</option><option>Available today</option><option>Available this week</option></select></label></div><button className="form-submit citizen-submit" type="submit"><Send size={16} /> Send volunteer request</button></form></>;
}