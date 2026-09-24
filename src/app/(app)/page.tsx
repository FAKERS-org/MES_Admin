import Link from "next/link";
import { ArrowRight, Building2, FilePlus2, Globe2, Lock } from "lucide-react";

import { apiRequest, fetchHealth, publishedIds } from "@/lib/server-api";
import { API_DOCS_URL } from "@/lib/config";
import type { UniversitySummary } from "@/lib/types";
import { PageHeader } from "@/components/ui/feedback";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge, TypeBadge } from "@/components/universities/badges";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [universities, health, published] = await Promise.all([
    apiRequest<UniversitySummary[]>("admin/universities/?skip=0&limit=1000"),
    fetchHealth(),
    publishedIds(),
  ]);

  const total = universities.length;
  const publishedCount = universities.filter((u) => published.has(u.id)).length;
  const draftCount = total - publishedCount;
  const privateCount = universities.filter((u) => u.type === "PRIVATE").length;
  const recent = universities.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title={<h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>}
        subtitle="Everything below is read live from the MES_Api FastAPI service."
        actions={
          <>
            <a href={API_DOCS_URL} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
              <Globe2 className="size-4" />
              API docs
            </a>
            <Link href="/universities/new" className={buttonVariants()}>
              <FilePlus2 className="size-4" />
              New university
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Universities" value={total} hint="All records, drafts included" accent="primary" />
        <StatCard label="Published" value={publishedCount} hint="Visible on the public apps" accent="success" />
        <StatCard label="Drafts" value={draftCount} hint="Visible only in this admin" accent="warning" />
        <StatCard
          label="Private / Public"
          value={`${privateCount} / ${total - privateCount}`}
          hint="Institution ownership split"
          accent="muted"
        />
      </div>

      <div
        className={`flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
          health.ok ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"
        }`}
        role="status"
      >
        <span className={`size-2 rounded-full ${health.ok ? "bg-success" : "bg-destructive"}`} />
        {health.ok ? (
          <>
            MES_Api connected
            <span className="text-success/80">
              · env: {health.env} · status: {health.status}
            </span>
          </>
        ) : (
          <>MES_Api is unreachable. Start it with `uv run uvicorn app.main:app --reload`.</>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle>Universities</CardTitle>
            <CardDescription>The first records returned by the admin API.</CardDescription>
          </div>
          <Link href="/universities" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            View all
            <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
              <Building2 className="size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No universities yet. Create the first one to get started.
              </p>
              <Link href="/universities/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
                New university
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>University</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Province</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((university) => (
                  <TableRow key={university.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                          {(university.abbreviation ?? university.name_en).slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{university.name_en}</p>
                          {university.name_kh ? (
                            <p className="truncate text-xs text-muted-foreground">{university.name_kh}</p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={university.type} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{university.province}</TableCell>
                    <TableCell>
                      <StatusBadge status={published.has(university.id) ? "PUBLISHED" : "DRAFT"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/universities/${university.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5" />
        Draft records never leave this admin - the public API only serves published universities.
        {health.ok ? <Badge variant="outline">MoEYS catalogue module</Badge> : null}
      </p>
    </div>
  );
}
