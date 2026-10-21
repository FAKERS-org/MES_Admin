"use client";

import { Folder, Layers, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import { setBreadcrumbLabel } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import ConfirmButton from "@/components/ui/confirm-button";
import { Alert, EmptyState, Spinner } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/field";
import UnitFields, { unitPayload } from "@/components/units/unit-fields";
import { apiRequest } from "@/lib/api";
import { UNIT_KINDS, type UnitSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function UnitManager({
    universityId,
    units,
}: {
    universityId: string;
    units: UnitSummary[];
}) {
    const router = useRouter();
    const [items, setItems] = useState<UnitSummary[]>(units ?? []);
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const [search, setSearch] = useState("");
    const [kindFilter, setKindFilter] = useState("");
    const [sortBy, setSortBy] = useState("name_asc");

    const filtered = items.filter(u => {
        if (kindFilter && u.kind !== kindFilter) return false;
        if (search) {
            const term = search.toLowerCase();
            const text = `${u.name_en} ${u.name_kh ?? ""} ${u.category_en ?? ""}`.toLowerCase();
            if (!text.includes(term)) return false;
        }
        return true;
    }).sort((a, b) => {
        if (sortBy === "name_desc") return b.name_en.localeCompare(a.name_en);
        if (sortBy === "id_desc") return Number(b.id) - Number(a.id);
        if (sortBy === "id_asc") return Number(a.id) - Number(b.id);
        return a.name_en.localeCompare(b.name_en);
    });

    // Keep local rows in sync when the server component refetches after router.refresh().
    useEffect(() => {
        setItems(units);
        if (units) {
            for (const unit of units) {
                setBreadcrumbLabel(`/universities/${universityId}/units/${unit.id}`, unit.name_en);
            }
        }
    }, [units, universityId]);

    function flash(message: string) {
        setSaved(message);
        setError(null);
    }

    /** Insert or replace a row so an edit never shows up as a duplicate. */
    function upsert(unit: UnitSummary) {
        setItems(current => {
            const index = current.findIndex(item => item.id === unit.id);
            if (index === -1) return [...current, unit];
            const next = [...current];
            next[index] = unit;
            return next;
        });
    }

    function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const payload = unitPayload(new FormData(event.currentTarget));
        if (!payload.name_en) {
            setError("Name (English) is required.");
            return;
        }

        startTransition(async () => {
            try {
                const created = await apiRequest<UnitSummary>(
                    `/api/admin/universities/${universityId}/units`,
                    { method: "POST", body: payload }
                );
                upsert(created);
                setAdding(false);
                flash(`“${created.name_en}” added.`);
                router.refresh();
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Could not add the unit.");
            }
        });
    }

    function handleUpdate(unit: UnitSummary) {
        return (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const payload = unitPayload(new FormData(event.currentTarget));
            if (!payload.name_en) {
                setError("Name (English) is required.");
                return;
            }

            startTransition(async () => {
                try {
                    const updated = await apiRequest<UnitSummary>(
                        `/api/admin/universities/${universityId}/units/${unit.id}`,
                        { method: "PATCH", body: payload }
                    );
                    upsert(updated);
                    setEditingId(null);
                    flash(`“${updated.name_en}” updated.`);
                    router.refresh();
                } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "Could not update the unit.");
                }
            });
        };
    }

    function handleDelete(unit: UnitSummary) {
        return async () => {
            try {
                await apiRequest(`/api/admin/universities/${universityId}/units/${unit.id}`, {
                    method: "DELETE",
                });
                setItems(current => current.filter(item => item.id !== unit.id));
                flash(`“${unit.name_en}” deleted.`);
                router.refresh();
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Could not delete the unit.");
            }
        };
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Folder className="size-4 text-primary" />
                    <h3 className="text-base font-semibold">Units (Faculties & Departments)</h3>
                    <Badge variant="outline">{items.length}</Badge>
                </div>
                {!adding ? (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setAdding(true);
                            setEditingId(null);
                        }}
                    >
                        <Plus className="size-4" />
                        Add unit
                    </Button>
                ) : null}
            </div>

            {error ? <Alert>{error}</Alert> : null}
            {saved && !error ? <Alert variant="success">{saved}</Alert> : null}

            {adding ? (
                <form onSubmit={handleCreate} className="space-y-4 rounded-xl border bg-muted/30 p-4">
                    <p className="text-sm font-medium">New unit</p>
                    <UnitFields siblings={items} />
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={pending}>
                            {pending ? <Spinner className="size-3.5" /> : null}
                            {pending ? "Adding…" : "Add unit"}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setAdding(false)}
                            disabled={pending}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            ) : null}

            {items.length === 0 && !adding ? (
                <EmptyState
                    title="No units yet"
                    description="Add faculties, departments, or other organizational units so students can explore the structure."
                    action={
                        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                            <Plus className="size-4" />
                            Add unit
                        </Button>
                    }
                />
            ) : null}

            {items.length > 0 ? (
                <div className="space-y-3">
                    {/* Filter and Sort Bar */}
                    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 shadow-sm">
                        <div className="min-w-44 flex-1">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search units…"
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        <div className="w-40">
                            <Select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
                                <option value="">All kinds</option>
                                {UNIT_KINDS.map((k) => (
                                    <option key={k} value={k}>
                                        {k.replace(/_/g, " ")}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div className="w-44">
                            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                <option value="name_asc">Name (A-Z)</option>
                                <option value="name_desc">Name (Z-A)</option>
                                <option value="id_desc">Newest first</option>
                                <option value="id_asc">Oldest first</option>
                            </Select>
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            No units match your search or filter.
                        </p>
                    ) : (
                        <div className="divide-y rounded-xl border">
                            {filtered.map(unit => {
                                const parent = items.find(item => item.id === unit.parent_id);

                                return editingId === unit.id ? (
                                    <form key={unit.id} onSubmit={handleUpdate(unit)} className="space-y-4 bg-muted/30 p-4">
                                        <p className="text-sm font-medium">Edit “{unit.name_en}”</p>
                                        <UnitFields defaultValue={unit} siblings={items} />
                                        <div className="flex gap-2">
                                            <Button type="submit" size="sm" disabled={pending}>
                                                {pending ? <Spinner className="size-3.5" /> : null}
                                                {pending ? "Saving…" : "Save unit"}
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setEditingId(null)}
                                                disabled={pending}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div key={unit.id} className="flex flex-wrap items-center gap-3 p-3.5">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {unit.name_en}
                                                {unit.name_kh ? (
                                                    <span className="ml-2 font-normal text-muted-foreground">
                                                        · {unit.name_kh}
                                                    </span>
                                                ) : null}
                                            </p>
                                            <p className={cn("mt-0.5 truncate text-xs text-muted-foreground")}>
                                                {[
                                                    parent ? `Under ${parent.name_en}` : "Top-level unit",
                                                    unit.category_en || null,
                                                ].filter(Boolean).join(" · ")}
                                            </p>
                                        </div>

                                        <Badge variant="outline">{unit.kind.replace(/_/g, " ")}</Badge>

                                        <div className="flex items-center gap-1.5">
                                            <Link
                                                href={`/universities/${universityId}/units/${unit.id}`}
                                                className={buttonVariants({ variant: "outline", size: "sm" })}
                                            >
                                                <Layers className="size-3.5" />
                                                Content
                                            </Link>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setEditingId(unit.id);
                                                    setAdding(false);
                                                }}
                                                aria-label={`Edit ${unit.name_en}`}
                                            >
                                                <Pencil className="size-3.5" />
                                                Edit
                                            </Button>
                                            <ConfirmButton
                                                onConfirm={handleDelete(unit)}
                                                confirmLabel={`Delete “${unit.name_en}” and its content?`}
                                            >
                                                <Trash2 className="size-3.5" />
                                                Delete
                                            </ConfirmButton>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
