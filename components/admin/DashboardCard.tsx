import Link from "next/link";
import { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

export function DashboardCard({
  title,
  count,
  href,
  children,
}: {
  title: string;
  count: number;
  href: string;
  children: ReactNode;
}) {
  return (
    <Card className="dashboard-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="section-title">{title}</h2>
        <span className="count-bubble">{count}</span>
      </div>
      <div className="scroll-list">{children}</div>
      <Link href={href} className="view-link">
        View all →
      </Link>
    </Card>
  );
}
