"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Building2,
    ExternalLink,
    FolderTree,
    GraduationCap,
    Layers,
    Pencil,
    Plus,
    Search,
    Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ConfirmButton from "@/components/ui/confirm-button";
import { Alert, EmptyState, PageHeader, Spinner } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import UnitFields, { unitPayload, UNIT_KIND_LABELS } from "@/components/units/unit-fields";
import { apiRequest } from "@/lib/api";
import {
    UNIT_KINDS,
    type Page,
    type UnitCreateDirectPayload,
    type UnitKind,
    type UnitListItem,
    type UnitSummary,
    type UnitUpdatePayload,
    type UniversitySummary,
} from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const UNIT_KIND_BADGES: Record<UnitKind, { label: string; className: string }> = {
    FACULTY: {
        label: "Faculty",
        className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    },
    INSTITUTE: {
        label: "Institute",
        className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    },
    SCHOOL: {
        label: "School",
        className: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    },
    COLLEGE: {
        label: "College",
        className: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    },
    DEPARTMENT: {
        label: "Department",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    },
    SUB_DEPARTMENT: {
        label: "Sub-Dept / Lab",
        className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    },
    CENTER: {
        label: "Center",
        className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    },
    ACADEMY: {
        label: "Academy",
        className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
    },
    DIVISION: {
        label: "Division",
        className: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-800",
    },
    FOUNDATION: {
        label: "Foundation",
        className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    },
    OTHER: {
        label: "Other",
        className: "bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-950/40 dark:text-neutral-300 dark:border-neutral-800",
    },
};

function raw(form: FormData, key: string): string {
    return String(form.get(key) ?? "").trim();
}

function nullable(form: FormData, key: string): string | null {
    return raw(form, key) || null;
}

function numberOrNull(form: FormData, key: string): number | null {
    const value = raw(form, key);
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export function UnitsManager({
    initialUnits,
    universities,
}: {
    initialUnits: UnitListItem[];
    universities: UniversitySummary[];
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const [units, setUnits] = useState<UnitListItem[]>(initialUnits);
    const [search, setSearch] = useState("");
    const [uniFilter, setUniFilter] = useState("");
    const [kindFilter, setKindFilter] = useState("");

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<UnitListItem | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);

    // Dynamic sibling units cache for parent dropdown
    const [selectedUniForNew, setSelectedUniForNew] = useState("");
    const [uniUnitsCache, setUniUnitsCache] = useState<Record<string, UnitSummary[]>>({});
    const [loadingUniUnits, setLoadingUniUnits] = useState(false);

    useEffect(() => {
        setUnits(initialUnits);
    }, [initialUnits]);

    const fetchUniUnits = async (uniId: string | number) => {
        const key = String(uniId);
        if (!key || uniUnitsCache[key]) return;
        setLoadingUniUnits(true);
        try {
            const res = await apiRequest<Page<UnitSummary> | UnitSummary[]>(
                `/api/admin/universities/${key}/units?limit=100`
            );
            const list = Array.isArray(res) ? res : (res?.items ?? []);
            setUniUnitsCache((prev) => ({ ...prev, [key]: list }));
        } catch {
            setUniUnitsCache((prev) => ({ ...prev, [key]: [] }));
        } finally {
            setLoadingUniUnits(false);
        }
    };

    useEffect(() => {
        if (selectedUniForNew) {
            fetchUniUnits(selectedUniForNew);
        }
    }, [selectedUniForNew]);

    useEffect(() => {
        if (editingUnit && editingUnit.university_id) {
            fetchUniUnits(editingUnit.university_id);
        }
    }, [editingUnit]);

    function flash(message: string) {
        setSaved(message);
        setError(null);
    }

    const filtered = useMemo(() => {
        return units.filter((u) => {
            if (uniFilter && String(u.university_id) !== uniFilter) return false;
            if (kindFilter && u.kind !== kindFilter) return false;
            if (search) {
                const term = search.toLowerCase();
                const text = `${u.name_en} ${u.name_kh ?? ""} ${u.category_en ?? ""} ${u.university_name ?? ""} ${u.university_abbreviation ?? ""} ${u.parent_name ?? ""}`.toLowerCase();
                if (!text.includes(term)) return false;
            }
            return true;
        });
    }, [units, uniFilter, kindFilter, search]);

    // Quick metric counters
    const facultiesCount = useMemo(() => units.filter((u) => u.kind === "FACULTY").length, [units]);
    const departmentsCount = useMemo(() => units.filter((u) => u.kind === "DEPARTMENT").length, [units]);
    const subDeptCount = useMemo(() => units.filter((u) => u.kind === "SUB_DEPARTMENT").length, [units]);

    const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const form = new FormData(e.currentTarget);
        const uniId = raw(form, "university_id");

        if (!uniId) {
            setError("Please select a university.");
            return;
        }

        const basePayload = unitPayload(form);
        if (!basePayload.name_en) {
            setError("Name (English) is required.");
            return;
        }

        const payload: UnitCreateDirectPayload = {
            ...basePayload,
            university_id: Number(uniId),
        };

        startTransition(async () => {
            try {
                const created = await apiRequest<UnitListItem>("/api/admin/units", {
                    method: "POST",
                    body: payload,
                });
                const uni = universities.find((u) => String(u.id) === uniId);
                const enriched: UnitListItem = {
                    ...created,
                    university_id: Number(uniId),
                    university_name: uni?.name_en ?? "",
                    university_abbreviation: uni?.abbreviation ?? "",
                };
                setUnits((prev) => [enriched, ...prev]);
                setIsCreateOpen(false);
                setSelectedUniForNew("");
                flash(`“${created.name_en}” created successfully.`);
                router.refresh();
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to create unit");
            }
        });
    };

    const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingUnit) return;
        setError(null);
        const form = new FormData(e.currentTarget);

        const payload: UnitUpdatePayload = unitPayload(form);
        if (!payload.name_en) {
            setError("Name (English) is required.");
            return;
        }

        startTransition(async () => {
            try {
                const updated = await apiRequest<UnitSummary>(`/api/admin/units/${editingUnit.id}`, {
                    method: "PATCH",
                    body: payload,
                });
                setUnits((prev) =>
                    prev.map((item) =>
                        item.id === updated.id
                            ? {
                                  ...item,
                                  ...updated,
                              }
                            : item
                    )
                );
                setEditingUnit(null);
                flash(`“${updated.name_en}” updated successfully.`);
                router.refresh();
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to update unit");
            }
        });
    };

    const handleDelete = (unit: UnitListItem) => async () => {
        setError(null);
        startTransition(async () => {
            try {
                await apiRequest(`/api/admin/units/${unit.id}`, { method: "DELETE" });
                setUnits((prev) => prev.filter((item) => item.id !== unit.id));
                flash(`“${unit.name_en}” deleted.`);
                router.refresh();
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to delete unit");
            }
        });
    };

    const createSiblings = selectedUniForNew ? uniUnitsCache[selectedUniForNew] ?? [] : [];
    const editSiblings = editingUnit?.university_id ? uniUnitsCache[String(editingUnit.university_id)] ?? [] : [];

    return (
        <div className="space-y-6">
            <PageHeader
                title={
                    <div className="flex items-center gap-2.5">
                        <FolderTree className="size-6 text-foreground shrink-0" />
                        <h1 className="text-2xl font-semibold tracking-tight">Academic Units</h1>
                    </div>
                }
                subtitle={`${filtered.length} of ${units.length} units match current filters.`}
                actions={
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5 shadow-2xs">
                        <Plus className="size-4" />
                        New unit
                    </Button>
                }
            />

            {/* Quick Summary Pill Bar */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-2xs">
                    <span className="font-semibold text-foreground">{units.length}</span> Total Units
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900 shadow-2xs">
                    <span className="font-semibold">{facultiesCount}</span> Faculties
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900 shadow-2xs">
                    <span className="font-semibold">{departmentsCount}</span> Departments
                </div>
                {subDeptCount > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border bg-purple-50/50 dark:bg-purple-950/20 px-3 py-1.5 text-xs text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900 shadow-2xs">
                        <span className="font-semibold">{subDeptCount}</span> Sub-Depts / Labs
                    </div>
                )}
            </div>

            {error && (
                <Alert variant="destructive">
                    <div className="flex items-center justify-between">
                        <span>{error}</span>
                        <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-6 px-2 text-xs">✕</Button>
                    </div>
                </Alert>
            )}
            {saved && !error && <Alert variant="success">{saved}</Alert>}

            {/* Clean Filter Toolbar */}
            <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-2xs">
                <div className="min-w-60 flex-1 space-y-1.5">
                    <label htmlFor="u-search" className="text-xs font-medium text-muted-foreground">Search</label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="u-search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Unit name, category, or university…"
                            className="pl-8 text-xs bg-background"
                        />
                    </div>
                </div>

                <div className="w-52 space-y-1.5">
                    <label htmlFor="u-uni" className="text-xs font-medium text-muted-foreground">University</label>
                    <Select id="u-uni" value={uniFilter} onChange={(e) => setUniFilter(e.target.value)} className="text-xs bg-background">
                        <option value="">All universities</option>
                        {universities.map((u) => (
                            <option key={u.id} value={String(u.id)}>
                                {u.abbreviation ? `${u.abbreviation} — ` : ""}{u.name_en}
                            </option>
                        ))}
                    </Select>
                </div>

                <div className="w-44 space-y-1.5">
                    <label htmlFor="u-kind-filter" className="text-xs font-medium text-muted-foreground">Unit Kind</label>
                    <Select id="u-kind-filter" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className="text-xs bg-background">
                        <option value="">All unit kinds</option>
                        {UNIT_KINDS.map((kind) => (
                            <option key={kind} value={kind}>
                                {UNIT_KIND_LABELS[kind] ?? kind}
                            </option>
                        ))}
                    </Select>
                </div>

                {(search || uniFilter || kindFilter) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setSearch("");
                            setUniFilter("");
                            setKindFilter("");
                        }}
                        className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground self-end"
                    >
                        Reset filters
                    </Button>
                )}
            </div>

            {/* Units Data Table */}
            <Card className="overflow-hidden border shadow-2xs">
                <CardContent className="p-0">
                    {filtered.length === 0 ? (
                        <div className="py-12">
                            <EmptyState
                                title="No units found"
                                description="No academic units match your search filters, or none have been added yet."
                                action={
                                    <Button onClick={() => setIsCreateOpen(true)} variant="outline" size="sm" className="gap-1.5">
                                        <Plus className="size-4" />
                                        Add unit
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-[320px]">Unit Name</TableHead>
                                    <TableHead>University</TableHead>
                                    <TableHead>Kind</TableHead>
                                    <TableHead>Parent Unit</TableHead>
                                    <TableHead className="text-center">Programs</TableHead>
                                    <TableHead>Default Tuition</TableHead>
                                    <TableHead className="text-right pr-4">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((unit) => {
                                    const kindBadge = UNIT_KIND_BADGES[unit.kind] ?? {
                                        label: unit.kind,
                                        className: "bg-muted text-muted-foreground",
                                    };

                                    return (
                                        <TableRow key={unit.id} className="hover:bg-muted/20 transition-colors">
                                            {/* Unit Name */}
                                            <TableCell>
                                                <div className="space-y-0.5">
                                                    <div className="font-semibold text-sm text-foreground flex items-center gap-1.5 flex-wrap">
                                                        <span>{unit.name_en}</span>
                                                        {unit.acronym && (
                                                            <span className="text-3xs font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                                [{unit.acronym}]
                                                            </span>
                                                        )}
                                                        {unit.is_autonomous && (
                                                            <span className="text-3xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                                                Autonomous
                                                            </span>
                                                        )}
                                                        {unit.position !== undefined && unit.position > 0 && (
                                                            <span className="text-3xs text-muted-foreground font-mono bg-muted px-1 rounded">
                                                                #{unit.position}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {unit.name_kh && (
                                                        <div className="text-xs text-muted-foreground font-khmer">
                                                            {unit.name_kh}
                                                        </div>
                                                    )}
                                                    {unit.category_en && (
                                                        <div className="text-3xs text-muted-foreground/80">
                                                            Category: {unit.category_en}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* University */}
                                            <TableCell>
                                                {unit.university_id ? (
                                                    <Link
                                                        href={`/universities/${unit.university_id}`}
                                                        className="font-medium text-xs text-primary hover:underline inline-flex items-center gap-1"
                                                    >
                                                        <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                                                        <span className="truncate max-w-[200px]" title={unit.university_name ?? ""}>
                                                            {unit.university_abbreviation || unit.university_name || `Uni #${unit.university_id}`}
                                                        </span>
                                                    </Link>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </TableCell>

                                            {/* Kind Badge */}
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={cn("text-3xs uppercase font-medium px-2 py-0.5 border", kindBadge.className)}
                                                >
                                                    {kindBadge.label}
                                                </Badge>
                                            </TableCell>

                                            {/* Parent Unit */}
                                            <TableCell>
                                                {unit.parent_name ? (
                                                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                                        <span className="text-foreground/60">↳</span>
                                                        <span className="font-medium text-foreground">{unit.parent_name}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-2xs text-muted-foreground/60 italic">Top level (Faculty)</span>
                                                )}
                                            </TableCell>

                                            {/* Programs Count */}
                                            <TableCell className="text-center">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2 py-0.5 text-xs font-semibold text-foreground">
                                                    <GraduationCap className="size-3 text-muted-foreground" />
                                                    {unit.programs_count ?? 0}
                                                </span>
                                            </TableCell>

                                            {/* Default Tuition */}
                                            <TableCell className="text-xs">
                                                {unit.default_tuition_per_year ? (
                                                    <div className="space-y-0.5">
                                                        <span className="font-medium text-foreground">
                                                            {formatCurrency(unit.default_tuition_per_year)}/yr
                                                        </span>
                                                        {unit.default_tuition_female_per_year ? (
                                                            <div className="text-3xs text-rose-600 dark:text-rose-400 font-medium">
                                                                ♀ {formatCurrency(unit.default_tuition_female_per_year)}/yr
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground/60 text-2xs italic">Inherit Univ</span>
                                                )}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right pr-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    {unit.university_id && (
                                                        <Link
                                                            href={`/universities/${unit.university_id}/units/${unit.slug ?? unit.id}`}
                                                            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                            title="View unit content & curriculum"
                                                        >
                                                            <Layers className="size-3.5" />
                                                        </Link>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="size-7 p-0 rounded-md text-muted-foreground hover:text-foreground"
                                                        onClick={() => setEditingUnit(unit)}
                                                        title="Edit unit"
                                                    >
                                                        <Pencil className="size-3.5" />
                                                    </Button>
                                                    <ConfirmButton
                                                        onConfirm={handleDelete(unit)}
                                                        confirmLabel={`Delete “${unit.name_en}”?`}
                                                        title={`Delete “${unit.name_en}”`}
                                                        className="size-7 p-0 rounded-md"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </ConfirmButton>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create Unit Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => {
                    setIsCreateOpen(false);
                    setSelectedUniForNew("");
                }}
                title="Create Academic Unit"
                icon={<Plus className="size-4 text-foreground" />}
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="space-y-4">
                        <Field label="University" htmlFor="nu-uni" required>
                            <Select
                                id="nu-uni"
                                name="university_id"
                                value={selectedUniForNew}
                                onChange={(e) => setSelectedUniForNew(e.target.value)}
                                required
                            >
                                <option value="">Select University</option>
                                {universities.map((u) => (
                                    <option key={u.id} value={String(u.id)}>
                                        {u.name_en} ({u.abbreviation || u.province})
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <UnitFields siblings={createSiblings} />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setIsCreateOpen(false);
                                setSelectedUniForNew("");
                            }}
                            disabled={pending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={pending}>
                            {pending ? <Spinner className="size-3.5" /> : null}
                            {pending ? "Creating…" : "Create Unit"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Unit Modal */}
            <Modal
                isOpen={Boolean(editingUnit)}
                onClose={() => setEditingUnit(null)}
                title={editingUnit ? `Edit “${editingUnit.name_en}”` : "Edit Unit"}
                icon={<Pencil className="size-4 text-muted-foreground" />}
                maxWidth="max-w-2xl"
            >
                {editingUnit && (
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="p-2.5 rounded-lg border bg-muted/20 text-xs flex items-center justify-between">
                            <span className="text-muted-foreground">University:</span>
                            <span className="font-semibold text-foreground">
                                {editingUnit.university_name || `University #${editingUnit.university_id}`}
                            </span>
                        </div>

                        <UnitFields defaultValue={editingUnit} siblings={editSiblings} />

                        <div className="flex items-center justify-end gap-2 pt-3 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingUnit(null)}
                                disabled={pending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={pending}>
                                {pending ? <Spinner className="size-3.5" /> : null}
                                {pending ? "Saving…" : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}

