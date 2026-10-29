"use client";

import {
    ChevronDown,
    ChevronRight,
    CircleDollarSign,
    CornerDownRight,
    Folder,
    FolderTree,
    GraduationCap,
    GripVertical,
    Layers,
    List,
    Pencil,
    Plus,
    Search,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type DragEvent, type FormEvent } from "react";

import { setBreadcrumbLabel } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import ConfirmButton from "@/components/ui/confirm-button";
import { Alert, EmptyState, Spinner } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/field";
import UnitFields, { unitPayload } from "@/components/units/unit-fields";
import { apiRequest } from "@/lib/api";
import { resolveProgramTuition } from "@/lib/tuition";
import { UNIT_KINDS, type ProgramSummary, type UnitSummary } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

interface DragPayload {
    type: "unit" | "program";
    id: string;
    sourceUnitId?: string | null;
}

export default function UnitManager({
    universityId,
    universitySlug,
    units,
    programs = [],
    defaultTuitionPerYear,
    defaultTuitionFemalePerYear,
}: {
    universityId: string;
    universitySlug?: string;
    units: UnitSummary[];
    programs?: ProgramSummary[];
    defaultTuitionPerYear?: number | null;
    defaultTuitionFemalePerYear?: number | null;
}) {
    const router = useRouter();
    const [items, setItems] = useState<UnitSummary[]>(units ?? []);
    const [localPrograms, setLocalPrograms] = useState<ProgramSummary[]>(programs ?? []);

    const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
    const [adding, setAdding] = useState(false);
    const [defaultParentForNew, setDefaultParentForNew] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    // Drag and drop state
    const [draggedItem, setDraggedItem] = useState<DragPayload | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

    // Collapsed branches in tree view
    const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});

    // Filter/sort for list view
    const [search, setSearch] = useState("");
    const [kindFilter, setKindFilter] = useState("");
    const [sortBy, setSortBy] = useState("name_asc");

    // Sync from server props
    useEffect(() => {
        setItems(units ?? []);
        if (units) {
            for (const unit of units) {
                setBreadcrumbLabel(`/universities/${universitySlug ?? universityId}/units/${unit.id}`, unit.name_en);
            }
        }
    }, [units, universityId, universitySlug]);

    useEffect(() => {
        setLocalPrograms(programs ?? []);
    }, [programs]);

    function flash(message: string) {
        setSaved(message);
        setError(null);
    }

    function toggleCollapse(unitId: string | number) {
        const key = String(unitId);
        setCollapsedUnits(prev => ({ ...prev, [key]: !prev[key] }));
    }

    function upsert(unit: UnitSummary) {
        setItems(current => {
            const index = current.findIndex(item => String(item.id) === String(unit.id));
            if (index === -1) return [...current, unit];
            const next = [...current];
            next[index] = unit;
            return next;
        });
    }

    // --- Drag and Drop Handlers ---

    function handleDragStart(e: DragEvent, payload: DragPayload) {
        setDraggedItem(payload);
        e.dataTransfer.setData("application/json", JSON.stringify(payload));
        e.dataTransfer.effectAllowed = "move";
    }

    function handleDragOver(e: DragEvent, targetKey: string) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOverTarget !== targetKey) {
            setDragOverTarget(targetKey);
        }
    }

    function handleDragLeave(e: DragEvent, targetKey: string) {
        // Prevent clearing if entering child element
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        if (dragOverTarget === targetKey) {
            setDragOverTarget(null);
        }
    }

    function handleDrop(e: DragEvent, targetUnitId: string | number | null) {
        e.preventDefault();
        setDragOverTarget(null);

        let payload = draggedItem;
        if (!payload) {
            try {
                payload = JSON.parse(e.dataTransfer.getData("application/json")) as DragPayload;
            } catch {
                return;
            }
        }
        if (!payload) return;

        if (payload.type === "program") {
            const programId = String(payload.id);
            const targetIdStr = targetUnitId !== null && targetUnitId !== undefined ? String(targetUnitId) : null;
            const targetUnit = targetIdStr ? items.find(u => String(u.id) === targetIdStr) : null;
            const targetName = targetUnit ? targetUnit.name_en : "Unassigned / University-wide";

            // Optimistic update
            setLocalPrograms(prev =>
                prev.map(p =>
                    String(p.id) === programId
                        ? {
                              ...p,
                              unit_id: targetIdStr ? Number(targetIdStr) : null,
                              faculty: targetUnit ? targetUnit.name_en : null,
                          }
                        : p,
                ),
            );

            startTransition(async () => {
                try {
                    await apiRequest(`/api/admin/programs/${programId}`, {
                        method: "PATCH",
                        body: {
                            unit_id: targetIdStr ? Number(targetIdStr) : null,
                            faculty: targetUnit ? targetUnit.name_en : null,
                        },
                    });
                    flash(`Moved program to ${targetName}.`);
                    router.refresh();
                } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "Failed to move program.");
                    // Revert
                    setLocalPrograms(programs);
                }
            });
        } else if (payload.type === "unit") {
            const unitId = String(payload.id);
            const targetIdStr = targetUnitId !== null && targetUnitId !== undefined ? String(targetUnitId) : null;
            if (unitId === targetIdStr) return; // cannot parent to self

            // Disallow circular nesting: target cannot be a descendant of unitId
            const isDescendant = (checkId: string | null): boolean => {
                if (!checkId) return false;
                if (String(checkId) === unitId) return true;
                const parent = items.find(u => String(u.id) === String(checkId));
                return parent?.parent_id ? isDescendant(String(parent.parent_id)) : false;
            };

            if (isDescendant(targetIdStr)) {
                setError("Cannot move a unit under one of its own sub-units.");
                return;
            }

            const targetParent = targetIdStr ? items.find(u => String(u.id) === targetIdStr) : null;
            const targetName = targetParent ? `under ${targetParent.name_en}` : "to Top Level (Root)";

            // Optimistic update
            setItems(prev =>
                prev.map(u => (String(u.id) === unitId ? { ...u, parent_id: targetIdStr } : u)),
            );

            startTransition(async () => {
                try {
                    await apiRequest(`/api/admin/universities/${universityId}/units/${unitId}`, {
                        method: "PATCH",
                        body: { parent_id: targetIdStr ? Number(targetIdStr) : null },
                    });
                    flash(`Moved unit ${targetName}.`);
                    router.refresh();
                } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "Failed to move unit.");
                    setItems(units);
                }
            });
        }

        setDraggedItem(null);
    }

    // --- CRUD Handlers ---

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
                    { method: "POST", body: payload },
                );
                upsert(created);
                setAdding(false);
                setDefaultParentForNew(null);
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
                        { method: "PATCH", body: payload },
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

    // --- Tree Hierarchy Assembly ---
    const { rootUnits, childUnitsMap, programsByUnitId, unassignedPrograms } = useMemo(() => {
        const root: UnitSummary[] = [];
        const childMap: Record<string, UnitSummary[]> = {};
        const progMap: Record<string, ProgramSummary[]> = {};
        const unassigned: ProgramSummary[] = [];

        // Group units
        for (const unit of items) {
            if (!unit.parent_id) {
                root.push(unit);
            } else {
                const pId = String(unit.parent_id);
                if (!childMap[pId]) childMap[pId] = [];
                childMap[pId].push(unit);
            }
        }

        // Sort root and children
        root.sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name_en.localeCompare(b.name_en));
        for (const pId in childMap) {
            childMap[pId].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name_en.localeCompare(b.name_en));
        }

        // Group programs
        for (const prog of localPrograms) {
            if (prog.unit_id) {
                const uidStr = String(prog.unit_id);
                if (!progMap[uidStr]) progMap[uidStr] = [];
                progMap[uidStr].push(prog);
            } else {
                unassigned.push(prog);
            }
        }

        return { rootUnits: root, childUnitsMap: childMap, programsByUnitId: progMap, unassignedPrograms: unassigned };
    }, [items, localPrograms]);

    // Filter for list view
    const filteredList = items
        .filter(u => {
            if (kindFilter && u.kind !== kindFilter) return false;
            if (search) {
                const term = search.toLowerCase();
                const text = `${u.name_en} ${u.name_kh ?? ""} ${u.category_en ?? ""}`.toLowerCase();
                if (!text.includes(term)) return false;
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === "name_desc") return b.name_en.localeCompare(a.name_en);
            if (sortBy === "id_desc") return Number(b.id) - Number(a.id);
            if (sortBy === "id_asc") return Number(a.id) - Number(b.id);
            return a.name_en.localeCompare(b.name_en);
        });

    return (
        <div className="space-y-4">
            {/* Header with View Toggle and Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2">
                    <FolderTree className="size-5 text-primary" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold">Academic Units & Structure</h3>
                            <Badge variant="outline">{items.length} units</Badge>
                            <Badge variant="default">{localPrograms.length} programs</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Drag & drop departments into faculties, or programs into units. Tuition cascades automatically.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher */}
                    <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs">
                        <button
                            type="button"
                            onClick={() => setViewMode("tree")}
                            className={cn(
                                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                                viewMode === "tree"
                                    ? "bg-background text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <FolderTree className="size-3.5" />
                            Hierarchy Tree
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                                viewMode === "list"
                                    ? "bg-background text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <List className="size-3.5" />
                            Directory List
                        </button>
                    </div>

                    {!adding ? (
                        <Button
                            size="sm"
                            onClick={() => {
                                setAdding(true);
                                setDefaultParentForNew(null);
                                setEditingId(null);
                            }}
                        >
                            <Plus className="size-4" />
                            Add unit
                        </Button>
                    ) : null}
                </div>
            </div>

            {error ? <Alert>{error}</Alert> : null}
            {saved && !error ? <Alert variant="success">{saved}</Alert> : null}

            {/* Create unit form */}
            {adding ? (
                <form onSubmit={handleCreate} className="space-y-4 rounded-xl border bg-muted/30 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">
                            {defaultParentForNew
                                ? `Add department under “${items.find(u => u.id === defaultParentForNew)?.name_en}”`
                                : "New organizational unit"}
                        </p>
                        <Badge variant="outline">Create</Badge>
                    </div>
                    <UnitFields
                        siblings={items}
                        defaultValue={
                            defaultParentForNew
                                ? ({ parent_id: defaultParentForNew, kind: "DEPARTMENT" } as UnitSummary)
                                : undefined
                        }
                    />
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={pending}>
                            {pending ? <Spinner className="size-3.5" /> : null}
                            {pending ? "Adding…" : "Add unit"}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                setAdding(false);
                                setDefaultParentForNew(null);
                            }}
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
                    description="Create faculties, colleges, or departments so academic programs can be organized with inheritances."
                    action={
                        <Button size="sm" onClick={() => setAdding(true)}>
                            <Plus className="size-4" />
                            Add first unit
                        </Button>
                    }
                />
            ) : null}

            {/* TREE HIERARCHY VIEW WITH DRAG-AND-DROP */}
            {items.length > 0 && viewMode === "tree" && (
                <div className="space-y-4">
                    {/* Root Level Dropzone */}
                    <div
                        onDragOver={e => handleDragOver(e, "root")}
                        onDragLeave={e => handleDragLeave(e, "root")}
                        onDrop={e => handleDrop(e, null)}
                        className={cn(
                            "rounded-lg border-2 border-dashed p-3 text-center transition-all",
                            dragOverTarget === "root"
                                ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/40"
                                : "border-muted-foreground/20 bg-muted/10 hover:border-muted-foreground/40",
                        )}
                    >
                        <p className="text-xs text-muted-foreground">
                            Top-level container · Drag a department here to un-nest it to Root
                        </p>
                    </div>

                    {/* Faculties / Root Units */}
                    <div className="space-y-4">
                        {rootUnits.map(unit => {
                            const unitIdStr = String(unit.id);
                            const isEditing = String(editingId) === unitIdStr;
                            const children = childUnitsMap[unitIdStr] ?? [];
                            const unitPrograms = programsByUnitId[unitIdStr] ?? [];
                            const isCollapsed = Boolean(collapsedUnits[unitIdStr]);
                            const isTargeted = dragOverTarget === `unit-${unitIdStr}`;

                            return isEditing ? (
                                <form
                                    key={unit.id}
                                    onSubmit={handleUpdate(unit)}
                                    className="space-y-4 rounded-xl border bg-muted/30 p-4 shadow-xs"
                                >
                                    <p className="text-sm font-semibold">Edit “{unit.name_en}”</p>
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
                                <div
                                    key={unit.id}
                                    onDragOver={e => handleDragOver(e, `unit-${unit.id}`)}
                                    onDragLeave={e => handleDragLeave(e, `unit-${unit.id}`)}
                                    onDrop={e => handleDrop(e, unit.id)}
                                    className={cn(
                                        "rounded-xl border bg-card transition-all shadow-xs",
                                        isTargeted
                                            ? "border-primary ring-2 ring-primary/40 bg-primary/5"
                                            : "border-border hover:border-border/80",
                                    )}
                                >
                                    {/* Faculty / Top-level Node Header */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Drag Handle */}
                                            <div
                                                draggable
                                                onDragStart={e =>
                                                    handleDragStart(e, { type: "unit", id: unit.id })
                                                }
                                                className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground"
                                                title="Drag unit"
                                            >
                                                <GripVertical className="size-4" />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => toggleCollapse(unit.id)}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                {isCollapsed ? (
                                                    <ChevronRight className="size-4" />
                                                ) : (
                                                    <ChevronDown className="size-4" />
                                                )}
                                            </button>

                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-semibold text-base text-foreground">
                                                        {unit.name_en}
                                                    </span>
                                                    {unit.name_kh ? (
                                                        <span className="text-xs text-muted-foreground">
                                                            ({unit.name_kh})
                                                        </span>
                                                    ) : null}
                                                    <Badge variant="outline" className="text-2xs uppercase">
                                                        {unit.kind.replace(/_/g, " ")}
                                                    </Badge>
                                                    {unit.category_en ? (
                                                        <span className="text-xs text-muted-foreground">
                                                            · {unit.category_en}
                                                        </span>
                                                    ) : null}
                                                </div>

                                                {/* Tuition summary for this unit */}
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                                    <div className="flex items-center gap-1 font-medium text-foreground/80">
                                                        <CircleDollarSign className="size-3.5 text-primary" />
                                                        {unit.default_tuition_per_year !== null &&
                                                        unit.default_tuition_per_year !== undefined ? (
                                                            <span>
                                                                Default:{" "}
                                                                <strong className="text-foreground">
                                                                    {formatCurrency(unit.default_tuition_per_year)}
                                                                </strong>
                                                                /yr
                                                            </span>
                                                        ) : defaultTuitionPerYear !== null &&
                                                          defaultTuitionPerYear !== undefined ? (
                                                            <span className="text-muted-foreground">
                                                                Inherits Univ Default (
                                                                {formatCurrency(defaultTuitionPerYear)}/yr)
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground">
                                                                No default rate set
                                                            </span>
                                                        )}
                                                    </div>

                                                    {unit.default_tuition_female_per_year ? (
                                                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-medium text-2xs">
                                                            ♀ {formatCurrency(unit.default_tuition_female_per_year)}/yr
                                                            female incentive
                                                        </span>
                                                    ) : null}

                                                    <span className="text-muted-foreground/60">·</span>
                                                    <span className="text-muted-foreground">
                                                        {children.length} {children.length === 1 ? "dept" : "depts"}
                                                    </span>
                                                    <span className="text-muted-foreground/60">·</span>
                                                    <span className="text-muted-foreground">
                                                        {unitPrograms.length}{" "}
                                                        {unitPrograms.length === 1 ? "major" : "majors"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Unit Actions */}
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => {
                                                    setDefaultParentForNew(unit.id);
                                                    setAdding(true);
                                                }}
                                                title="Add department under this faculty"
                                            >
                                                <Plus className="size-3.5" />
                                                Add Dept
                                            </Button>
                                            <Link
                                                href={`/universities/${universitySlug ?? universityId}/units/${unit.slug}`}
                                                className={buttonVariants({ variant: "outline", size: "sm", className: "h-7 px-2 text-xs" })}
                                            >
                                                <Layers className="size-3.5" />
                                                Content
                                            </Link>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => setEditingId(unit.id)}
                                            >
                                                <Pencil className="size-3.5" />
                                                Edit
                                            </Button>
                                            <ConfirmButton
                                                onConfirm={handleDelete(unit)}
                                                confirmLabel={`Delete “${unit.name_en}”?`}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </ConfirmButton>
                                        </div>
                                    </div>

                                    {/* Children Departments & Programs Area */}
                                    {!isCollapsed && (
                                        <div className="border-t bg-muted/15 p-4 space-y-3">
                                            {/* Sub-units (Departments) */}
                                            {children.length > 0 ? (
                                                <div className="space-y-2 pl-3 border-l-2 border-primary/20">
                                                    <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                        Departments & Centers ({children.length})
                                                    </p>
                                                    {children.map(child => {
                                                        const childIdStr = String(child.id);
                                                        const childPrograms = programsByUnitId[childIdStr] ?? [];
                                                        const isChildTargeted =
                                                            dragOverTarget === `unit-${childIdStr}`;

                                                        return (
                                                            <div
                                                                key={child.id}
                                                                onDragOver={e => {
                                                                    e.stopPropagation();
                                                                    handleDragOver(e, `unit-${child.id}`);
                                                                }}
                                                                onDragLeave={e => {
                                                                    e.stopPropagation();
                                                                    handleDragLeave(e, `unit-${child.id}`);
                                                                }}
                                                                onDrop={e => {
                                                                    e.stopPropagation();
                                                                    handleDrop(e, child.id);
                                                                }}
                                                                className={cn(
                                                                    "rounded-lg border bg-card p-3 transition-all",
                                                                    isChildTargeted
                                                                        ? "border-primary ring-2 ring-primary/40 bg-primary/5"
                                                                        : "border-border/60 hover:border-border",
                                                                )}
                                                            >
                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <div
                                                                            draggable
                                                                            onDragStart={e =>
                                                                                handleDragStart(e, {
                                                                                    type: "unit",
                                                                                    id: child.id,
                                                                                })
                                                                            }
                                                                            className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground"
                                                                            title="Drag department to move to another faculty or top-level"
                                                                        >
                                                                            <GripVertical className="size-3.5" />
                                                                        </div>
                                                                        <CornerDownRight className="size-3.5 text-muted-foreground" />
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm font-medium">
                                                                                    {child.name_en}
                                                                                </span>
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className="text-2xs"
                                                                                >
                                                                                    {child.kind.replace(/_/g, " ")}
                                                                                </Badge>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                                                                                <span>
                                                                                    {child.default_tuition_per_year
                                                                                        ? `Default: ${formatCurrency(child.default_tuition_per_year)}/yr`
                                                                                        : `Inheriting faculty rate (${formatCurrency(unit.default_tuition_per_year ?? defaultTuitionPerYear)}/yr)`}
                                                                                </span>
                                                                                <span>·</span>
                                                                                <span>
                                                                                    {childPrograms.length} majors
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-1">
                                                                        <Link
                                                                            href={`/universities/${universitySlug ?? universityId}/units/${child.slug}`}
                                                                            className={buttonVariants({
                                                                                variant: "ghost",
                                                                                size: "sm",
                                                                                className: "h-6 px-1.5 text-xs",
                                                                            })}
                                                                        >
                                                                            <Layers className="size-3" />
                                                                            Content
                                                                        </Link>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className="h-6 px-1.5 text-xs"
                                                                            onClick={() => setEditingId(child.id)}
                                                                        >
                                                                            <Pencil className="size-3" />
                                                                        </Button>
                                                                        <ConfirmButton
                                                                            onConfirm={handleDelete(child)}
                                                                            confirmLabel={`Delete department “${child.name_en}”?`}
                                                                        >
                                                                            <Trash2 className="size-3" />
                                                                        </ConfirmButton>
                                                                    </div>
                                                                </div>

                                                                {/* Programs inside this child department */}
                                                                <div className="mt-2.5 space-y-1.5 pl-5 border-l border-muted-foreground/20">
                                                                    {childPrograms.length === 0 ? (
                                                                        <p className="text-2xs text-muted-foreground/70 italic py-1">
                                                                            No majors yet. Drag a program card here.
                                                                        </p>
                                                                    ) : (
                                                                        childPrograms.map(prog => (
                                                                            <ProgramDraggableItem
                                                                                key={prog.id}
                                                                                program={prog}
                                                                                unit={child}
                                                                                defaultTuitionPerYear={
                                                                                    defaultTuitionPerYear
                                                                                }
                                                                                defaultTuitionFemalePerYear={
                                                                                    defaultTuitionFemalePerYear
                                                                                }
                                                                                onDragStart={e =>
                                                                                    handleDragStart(e, {
                                                                                        type: "program",
                                                                                        id: prog.id,
                                                                                        sourceUnitId: child.id,
                                                                                    })
                                                                                }
                                                                            />
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}

                                            {/* Programs directly under this faculty */}
                                            <div className="space-y-1.5">
                                                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    Programs directly under {unit.name_en} ({unitPrograms.length})
                                                </p>
                                                {unitPrograms.length === 0 && children.length === 0 ? (
                                                    <p className="text-2xs text-muted-foreground/70 italic py-1">
                                                        Drop any program card here to assign it to this faculty.
                                                    </p>
                                                ) : (
                                                    unitPrograms.map(prog => (
                                                        <ProgramDraggableItem
                                                            key={prog.id}
                                                            program={prog}
                                                            unit={unit}
                                                            defaultTuitionPerYear={defaultTuitionPerYear}
                                                            defaultTuitionFemalePerYear={defaultTuitionFemalePerYear}
                                                            onDragStart={e =>
                                                                handleDragStart(e, {
                                                                    type: "program",
                                                                    id: prog.id,
                                                                    sourceUnitId: unit.id,
                                                                })
                                                            }
                                                        />
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Standalone / Unassigned Programs Tray */}
                    <div
                        onDragOver={e => handleDragOver(e, "unassigned")}
                        onDragLeave={e => handleDragLeave(e, "unassigned")}
                        onDrop={e => handleDrop(e, null)}
                        className={cn(
                            "rounded-xl border p-4 transition-all shadow-xs",
                            dragOverTarget === "unassigned"
                                ? "border-primary ring-2 ring-primary/40 bg-primary/5"
                                : "border-border/80 bg-muted/20",
                        )}
                    >
                        <div className="flex items-center justify-between gap-2 border-b pb-2 mb-3">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="size-4 text-muted-foreground" />
                                <h4 className="text-sm font-semibold">
                                    Unassigned / University-Wide Programs ({unassignedPrograms.length})
                                </h4>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                Drag any program here to clear faculty assignment
                            </span>
                        </div>

                        {unassignedPrograms.length === 0 ? (
                            <p className="py-2 text-center text-xs text-muted-foreground">
                                All programs are currently assigned to academic units.
                            </p>
                        ) : (
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {unassignedPrograms.map(prog => (
                                    <ProgramDraggableItem
                                        key={prog.id}
                                        program={prog}
                                        unit={null}
                                        defaultTuitionPerYear={defaultTuitionPerYear}
                                        defaultTuitionFemalePerYear={defaultTuitionFemalePerYear}
                                        onDragStart={e =>
                                            handleDragStart(e, {
                                                type: "program",
                                                id: prog.id,
                                                sourceUnitId: null,
                                            })
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* DIRECTORY LIST VIEW (Standard Table/List for filtering/searching) */}
            {items.length > 0 && viewMode === "list" && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-44 flex-1">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search units…"
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        <div className="w-40">
                            <Select value={kindFilter} onChange={e => setKindFilter(e.target.value)}>
                                <option value="">All kinds</option>
                                {UNIT_KINDS.map(k => (
                                    <option key={k} value={k}>
                                        {k.replace(/_/g, " ")}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div className="w-44">
                            <Select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                                <option value="name_asc">Name (A-Z)</option>
                                <option value="name_desc">Name (Z-A)</option>
                                <option value="id_desc">Newest first</option>
                                <option value="id_asc">Oldest first</option>
                            </Select>
                        </div>
                    </div>

                    {filteredList.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            No units match your search or filter.
                        </p>
                    ) : (
                        <div className="divide-y rounded-xl border">
                            {filteredList.map(unit => {
                                const parent = items.find(item => item.id === unit.parent_id);
                                const isEditing = editingId === unit.id;

                                return isEditing ? (
                                    <form
                                        key={unit.id}
                                        onSubmit={handleUpdate(unit)}
                                        className="space-y-4 bg-muted/30 p-4"
                                    >
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
                                                    unit.default_tuition_per_year
                                                        ? `Tuition: ${formatCurrency(unit.default_tuition_per_year)}/yr`
                                                        : null,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" · ")}
                                            </p>
                                        </div>

                                        <Badge variant="outline">{unit.kind.replace(/_/g, " ")}</Badge>

                                        <div className="flex items-center gap-1.5">
                                            <Link
                                                href={`/universities/${universitySlug ?? universityId}/units/${unit.slug}`}
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
            )}
        </div>
    );
}

/** Individual draggable program card displaying resolved effective tuition and source pill */
function ProgramDraggableItem({
    program,
    unit,
    defaultTuitionPerYear,
    defaultTuitionFemalePerYear,
    onDragStart,
}: {
    program: ProgramSummary;
    unit: UnitSummary | null;
    defaultTuitionPerYear?: number | null;
    defaultTuitionFemalePerYear?: number | null;
    onDragStart: (e: DragEvent) => void;
}) {
    const resolved = resolveProgramTuition(
        program,
        unit,
        defaultTuitionPerYear,
        defaultTuitionFemalePerYear,
    );

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="group flex items-center justify-between gap-2 rounded-lg border bg-background/80 p-2 shadow-2xs hover:border-primary/50 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing"
            title="Drag program to reassign unit"
        >
            <div className="flex items-center gap-2 min-w-0">
                <GripVertical className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-medium text-foreground">
                            {program.name_en}
                        </span>
                        <span className="rounded bg-muted px-1 py-0.2 text-3xs font-semibold uppercase text-muted-foreground shrink-0">
                            {program.degree_level}
                        </span>
                    </div>

                    {/* Tuition and Source Tag */}
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-2xs">
                        <span
                            className={cn(
                                "font-medium",
                                resolved.source === "program"
                                    ? "text-primary"
                                    : resolved.source === "unit"
                                      ? "text-foreground/90"
                                      : "text-muted-foreground",
                            )}
                        >
                            {formatCurrency(resolved.effectiveTuition, program.fee_currency)}/yr
                        </span>

                        <span
                            className={cn(
                                "rounded px-1 text-3xs font-normal",
                                resolved.source === "program"
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : resolved.source === "unit"
                                      ? "bg-secondary text-secondary-foreground"
                                      : "bg-muted text-muted-foreground",
                            )}
                            title={resolved.sourceLabel}
                        >
                            {resolved.source === "program"
                                ? "Custom"
                                : resolved.source === "unit"
                                  ? `⮑ ${unit?.name_en ?? "Unit"}`
                                  : "⮑ Univ"}
                        </span>

                        {resolved.effectiveFemale ? (
                            <span className="text-rose-600 dark:text-rose-400 font-medium text-3xs">
                                ♀ {formatCurrency(resolved.effectiveFemale, program.fee_currency)}
                                {resolved.discountPercent ? ` (-${resolved.discountPercent}%)` : ""}
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
