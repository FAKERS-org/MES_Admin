"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import { apiRequest } from "@/lib/api";

const labels: Record<string, string> = {
  universities: "Universities",
  new: "New university",
  programs: "Programs",
  units: "Units",
};

const titleCache: Record<string, string> = {};

export function setBreadcrumbLabel(href: string, label: string) {
  if (!label) return;
  titleCache[href] = label;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("breadcrumb-update", { detail: { href, label } }));
  }
}

function labelFor(segment: string, href: string, titles: Record<string, string>) {
  if (titles[href]) return titles[href];
  if (labels[segment]) return labels[segment];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment)) return segment.slice(0, 8).toUpperCase();
  return segment;
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const [titles, setTitles] = useState<Record<string, string>>(() => ({ ...titleCache }));

  useEffect(() => {
    function handleUpdate(event: Event) {
      const custom = event as CustomEvent<{ href: string; label: string }>;
      if (custom.detail?.href && custom.detail?.label) {
        setTitles(prev => ({ ...prev, [custom.detail.href]: custom.detail.label }));
      }
    }
    window.addEventListener("breadcrumb-update", handleUpdate);
    return () => window.removeEventListener("breadcrumb-update", handleUpdate);
  }, []);

  useEffect(() => {
    // University detail page: /universities/[id]
    if (segments[0] === "universities" && segments[1] && segments[1] !== "new") {
      const uniId = segments[1];
      const uniHref = `/universities/${uniId}`;
      if (!titleCache[uniHref]) {
        apiRequest<{ name_en: string }>(`/api/admin/universities/${uniId}`)
          .then(data => {
            if (data?.name_en) {
              titleCache[uniHref] = data.name_en;
              setTitles(prev => ({ ...prev, [uniHref]: data.name_en }));
            }
          })
          .catch(() => {});
      }
    }

    // Unit detail page: /universities/[id]/units/[unitId]
    if (segments[0] === "universities" && segments[1] && segments[2] === "units" && segments[3]) {
      const uniId = segments[1];
      const unitId = segments[3];
      const unitHref = `/universities/${uniId}/units/${unitId}`;
      if (!titleCache[unitHref]) {
        apiRequest<{ name_en: string }>(`/api/admin/universities/${uniId}/units/${unitId}`)
          .then(data => {
            if (data?.name_en) {
              titleCache[unitHref] = data.name_en;
              setTitles(prev => ({ ...prev, [unitHref]: data.name_en }));
            }
          })
          .catch(() => {});
      }
    }
  }, [pathname]);

  if (segments.length === 0) {
    return <nav className="text-sm font-medium text-foreground">Dashboard</nav>;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      <Link href="/" className="text-muted-foreground hover:text-foreground">
        Dashboard
      </Link>
      {segments.map((segment, index) => {
        let href = `/${segments.slice(0, index + 1).join("/")}`;
        if (segment === "units" && index > 0) {
          href = `/${segments.slice(0, index).join("/")}`;
        }
        const last = index === segments.length - 1;
        const label = labelFor(segment, href, titles);

        return (
          <Fragment key={`${href}-${index}`}>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
            {last ? (
              <span className="truncate font-medium text-foreground">{label}</span>
            ) : (
              <Link href={href} className="truncate text-muted-foreground hover:text-foreground">
                {label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
