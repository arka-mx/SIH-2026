import { Clock3 } from "lucide-react";
import { CitizenShell } from "@/components/citizen/CitizenShell";

export default function CitizenHistoryPage() {
  return <CitizenShell><div className="page-heading"><div><p className="eyebrow">Your activity</p><h1>My history</h1></div></div><div className="empty-state clay-panel"><Clock3 size={28} /><h2>No reports yet</h2><p>Your submitted reports and volunteer requests will appear here.</p></div></CitizenShell>;
}