import Link from "next/link";
import { FilePlus2, Search } from "lucide-react";

import { apiRequest, publishedIds } from "@/lib/server-api";
import type { Status, UniversitySummary } from "@/lib/types";
import { PageHeader } from "@/components/ui/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/feedback";
import { StatusBadge, TypeBadge } from "@/components/universities/badges";

export const metadata = { title: "Universities" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type Search = { q?: string; type?: string; status?: string; page?: string };

function buildHref(params: Search, page: number) {
  const url = new URLSearchParams();
  if (params.q) url.set("q", params.q);
  if (params.type) url.set("type", params.type);
  if (params.status) url.set("status", params.status);
  if (page > 1) url.set("page", String(page));
  const query = url.toString();
  return `/universities${query ? `?${query}` : ""}`;
}

export default async function UniversitiesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const type = params.type ?? "";
  const status = params.status ?? "";
  const requestedPage = Number(params.page ?? 1);

  const [universities, published] = await Promise.all([
    apiRequest<UniversitySummary[]>("admin/universities/?skip=0&limit=1000"),
    publishedIds(),
  ]);

  const rows = universities
    .map((university) => ({ ...university, isPublished: published.has(university.id) }))
    .filter((university) => {
      if (type && university.type !== type) return false;
      if (status === "PUBLISHED" && !university.isPublished) return false;
      if (status === "DRAFT" && university.isPublished) return false;
      if (
        q &&
        !`${university.name_en} ${university.name_kh ?? ""} ${university.abbreviation ?? ""} ${university.province}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, requestedPage || 1), totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters = Boolean(q || type || status);

  return (
    <div className="space-y-5">
      <PageHeader
        title={<h1 className="text-2xl font-semibold tracking-tight">Universities</h1>}
        subtitle={`${rows.length} of ${universities.length} records match the current filters.`}
        actions={
          <Link href="/universities/new" className={buttonVariants()}>
            <FilePlus2 className="size-4" />
            New university
          </Link>
        }
      />

      {/* Filters: plain GET form, works without client-side JavaScript. */}
      <form method="GET" action="/universities" className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="min-w-52 flex-1 space-y-1.5">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Name, abbreviation or province…" className="pl-8" />
          </div>
        </div>

        <div className="w-40 space-y-1.5">
          <label htmlFor="type" className="text-xs font-medium text-muted-foreground">
            Type
          </label>
          <Select id="type" name="type" defaultValue={type}>
            <option value="">All types</option>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </Select>
        </div>

        <div className="w-40 space-y-1.5">
          <label htmlFor="status" className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <Select id="status" name="status" defaultValue={status}>
            <option value="">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </Select>
        </div>

        <div className="flex gap-2">
          <button type="submit" className={buttonVariants()}>
            Apply
          </button>
          {hasFilters ? (
            <Link href="/universities" className={buttonVariants({ variant: "ghost" })}>
              Reset
            </Link>
          ) : null}
        </div>
      </form>

      <Card>
        <CardContent className="p-0">
          {pageRows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title={hasFilters ? "No universities match these filters" : "No universities yet"}
                description={
                  hasFilters
                    ? "Try a different search term, type or status."
                    : "Create your first university to start building the catalogue."
                }
                action={
                  hasFilters ? (
                    <Link href="/universities" className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Clear filters
                    </Link>
                  ) : (
                    <Link href="/universities/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
                      New university
                    </Link>
                  )
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>University</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Province</TableHead>
                  <TableHead>Established</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((university) => (
                  <TableRow key={university.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                          {(university.abbreviation ?? university.name_en).slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{university.name_en}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[university.name_kh, university.abbreviation && `(${university.abbreviation})`]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={university.type} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{university.province}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {university.established_year ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={university.isPublished ? "PUBLISHED" : "DRAFT"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/universities/${university.id}`} className="text-sm text-primary hover:underline">
                        Manage
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 ? (
              <Link href={buildHref(params, currentPage - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Previous
              </Link>
            ) : null}
            {currentPage < totalPages ? (
              <Link href={buildHref(params, currentPage + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
