"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { ChevronRight } from "lucide-react";

const labels: Record<string, string> = {
  universities: "Universities",
  new: "New university",
  programs: "Programs",
};

function labelFor(segment: string) {
  if (labels[segment]) return labels[segment];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment)) return segment.slice(0, 8).toUpperCase();
  return segment;
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return <nav className="text-sm font-medium text-foreground">Dashboard</nav>;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      <Link href="/" className="text-muted-foreground hover:text-foreground">
        Dashboard
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const last = index === segments.length - 1;
        return (
          <Fragment key={href}>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
            {last ? (
              <span className="truncate font-medium text-foreground">{labelFor(segment)}</span>
            ) : (
              <Link href={href} className="truncate text-muted-foreground hover:text-foreground">
                {labelFor(segment)}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
