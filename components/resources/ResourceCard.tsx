import { MapPin, PackageCheck } from "lucide-react";
import { Resource } from "@/types/resource";
import { Badge } from "@/components/ui/Badge";

export function ResourceCard({ resource }: { resource: Resource }) {
  const tone = resource.status === "Available" ? "green" : resource.status === "Unavailable" ? "red" : "amber";
  const usage = Math.round((resource.currentlyUsed / resource.total) * 100);
  return <article className="resource-card"><div className="flex items-start justify-between gap-3"><div><div className="mb-2 inline-flex rounded-xl bg-[#edf2e7] p-2 text-[#397254]"><PackageCheck size={18} /></div><p className="eyebrow">{resource.type}</p><h3 className="font-bold text-[#1b3324]">{resource.name}</h3></div><Badge tone={tone}>{resource.status}</Badge></div><p className="mt-3 flex items-center gap-1 text-xs text-[#607466]"><MapPin size={13} />{resource.location}</p><div className="resource-capacity"><div className="flex items-end justify-between"><span><strong>{resource.currentlyUsed.toLocaleString()}</strong> used of {resource.total.toLocaleString()} {resource.unit}</span><b>{usage}%</b></div><div className="capacity-track"><span style={{ width: `${usage}%` }} /></div></div><div className="resource-details"><span>GPS {resource.latitude.toFixed(4)} N, {resource.longitude.toFixed(4)} E</span><span>{resource.disasterTypes.join(" · ")}</span></div></article>;
}
