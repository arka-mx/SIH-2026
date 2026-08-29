import { mockResources } from "@/data/mockResources";
import { AdminShell } from "@/components/layout/AdminShell";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceMap } from "@/components/resources/ResourceMap";

export default function ResourcesPage() {
  const total = mockResources.reduce((sum, resource) => sum + resource.total, 0);
  const used = mockResources.reduce((sum, resource) => sum + resource.currentlyUsed, 0);
  return <AdminShell><div className="page-heading"><div><p className="eyebrow">District inventory and deployment</p><h1>Emergency resources</h1></div><span className="login-note">{mockResources.length} tracked assets · {used.toLocaleString()} currently deployed</span></div><div className="resource-overview"><div className="resource-stat"><span>Total capacity</span><strong>{total.toLocaleString()}</strong><small>across all resources</small></div><div className="resource-stat"><span>Currently used</span><strong>{used.toLocaleString()}</strong><small>active deployments</small></div><div className="resource-stat"><span>Available assets</span><strong>{mockResources.filter((resource) => resource.status === "Available").length}</strong><small>ready to dispatch</small></div><div className="resource-stat"><span>At scene</span><strong>{mockResources.filter((resource) => resource.status === "At scene").length}</strong><small>responding now</small></div></div><ResourceMap /><div className="resource-grid">{mockResources.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}</div></AdminShell>;
}
