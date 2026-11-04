"use client";

import {
    Building2,
    ChevronRight,
    ChevronsDownUp,
    ChevronsUpDown,
    Copy,
    FolderTree,
    GraduationCap,
    Layers,
    Pencil,
    Plus,
    Search,
    Sparkles,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";

import { setBreadcrumbLabel } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmButton from "@/components/ui/confirm-button";
import { Alert, EmptyState, Spinner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import ChildUnitCard from "@/components/universities/child-unit-card";
import ParentUnitCard from "@/components/universities/parent-unit-card";
import ProgramChip from "@/components/universities/program-chip";
import UnitFields, { unitPayload } from "@/components/units/unit-fields";
import { BatchProgramModal } from "@/components/programs/batch-program-modal";
import ProgramFields, { programPayload } from "@/components/programs/program-fields";
import { apiRequest } from "@/lib/api";
import { resolveProgramTuition } from "@/lib/tuition";
import type {
    Currency,
    DegreeLevel,
    ProgramCreatePayload,
    ProgramSummary,
    ProgramUpdatePayload,
    StudyShift,
    UnitCreatePayload,
    UnitSummary,
} from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function UniversityUnitManager({
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
    const [editingProgram, setEditingProgram] = useState<ProgramSummary | null>(null);
    const [quickAddUnit, setQuickAddUnit] = useState<UnitSummary | null>(null);
    const [cloningProgram, setCloningProgram] = useState<ProgramSummary | null>(null);
    const [batchTargetUnit, setBatchTargetUnit] = useState<UnitSummary | null>(null);
    const [isBatchOpen, setIsBatchOpen] = useState(false);

    const [adding, setAdding] = useState(false);
    const [defaultParentForNew, setDefaultParentForNew] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    // Collapsed state: maps unit ID to boolean (false = open, true = collapsed)
    const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});
    const [search, setSearch] = useState("");

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

    // --- CRUD Handlers ---

    function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formElem = event.currentTarget;
        const isAddAnother = (event.nativeEvent as SubmitEvent)?.submitter?.getAttribute("value") === "another";
        const payload = unitPayload(new FormData(formElem));
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
                flash(`“${created.name_en}” added.${isAddAnother ? " You can add another below." : ""}`);
                router.refresh();

                if (isAddAnother) {
                    const nameEnInput = formElem.querySelector<HTMLInputElement>("#u-name-en");
                    const nameKhInput = formElem.querySelector<HTMLInputElement>("#u-name-kh");
                    if (nameEnInput) {
                        nameEnInput.value = "";
                        nameEnInput.focus();
                    }
                    if (nameKhInput) nameKhInput.value = "";
                } else {
                    setAdding(false);
                    setDefaultParentForNew(null);
                }
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Could not add the unit.");
            }
        });
    }

    function handleCreateProgramSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formElem = event.currentTarget;
        const isAddAnother = (event.nativeEvent as SubmitEvent)?.submitter?.getAttribute("value") === "another";
        const payload = programPayload(new FormData(formElem)) as ProgramCreatePayload;
        if (!payload.name_en) {
            setError("Program name (English) is required.");
            return;
        }

        const selectedUnit = items.find(u => String(u.id) === String(payload.unit_id));
        if (selectedUnit) {
            if (selectedUnit.parent_id) {
                const parent = items.find(u => u.id === selectedUnit.parent_id);
                payload.faculty = parent ? parent.name_en : selectedUnit.name_en;
            } else {
                payload.faculty = selectedUnit.name_en;
            }
        }

        startTransition(async () => {
            try {
                const created = await apiRequest<ProgramSummary>(`/api/admin/universities/${universityId}/programs`, {
                    method: "POST",
                    body: payload,
                });
                setLocalPrograms(current => [...current, created]);
                flash(`“${created.name_en}” added.${isAddAnother ? " You can add another below." : ""}`);
                router.refresh();

                if (isAddAnother) {
                    const nameEnInput = formElem.querySelector<HTMLInputElement>("#p-name");
                    const nameKhInput = formElem.querySelector<HTMLInputElement>("#p-name-kh");
                    if (nameEnInput) {
                        nameEnInput.value = "";
                        nameEnInput.focus();
                    }
                    if (nameKhInput) nameKhInput.value = "";
                } else {
                    setQuickAddUnit(null);
                    setCloningProgram(null);
                }
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Could not add the program.");
            }
        });
    }

    function handleDeleteProgram(program: ProgramSummary) {
        return async () => {
            try {
                await apiRequest(`/api/admin/programs/${program.id}`, { method: "DELETE" });
                setLocalPrograms(current => current.filter(item => item.id !== program.id));
                flash(`“${program.name_en}” deleted.`);
                router.refresh();
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Could not delete the program.");
            }
        };
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

    function handleClone(unit: UnitSummary) {
        startTransition(async () => {
            try {
                const payload: UnitCreatePayload = {
                    name_en: `${unit.name_en} (Copy)`,
                    name_kh: unit.name_kh ? `${unit.name_kh} (ចម្លង)` : null,
                    kind: unit.kind,
                    parent_id: unit.parent_id ? String(unit.parent_id) : null,
                    category_en: unit.category_en ?? "",
                    category_kh: unit.category_kh ?? null,
                    logo: unit.logo ?? null,
                    position: (unit.position ?? 0) + 1,
                    default_tuition_per_year: unit.default_tuition_per_year ?? null,
                    default_tuition_female_per_year: unit.default_tuition_female_per_year ?? null,
                };

                const created = await apiRequest<UnitSummary>(
                    `/api/admin/universities/${universityId}/units`,
                    { method: "POST", body: payload },
                );

                // If cloning a faculty, also clone its child departments
                const children = !unit.parent_id ? (childUnitsMap[String(unit.id)] ?? []) : [];
                const clonedChildren: UnitSummary[] = [];
                for (const child of children) {
                    const childPayload: UnitCreatePayload = {
                        name_en: `${child.name_en} (Copy)`,
                        name_kh: child.name_kh ? `${child.name_kh} (ចម្លង)` : null,
                        kind: child.kind,
                        parent_id: String(created.id),
                        category_en: child.category_en ?? "",
                        category_kh: child.category_kh ?? null,
                        logo: child.logo ?? null,
                        position: child.position ?? 0,
                        default_tuition_per_year: child.default_tuition_per_year ?? null,
                        default_tuition_female_per_year: child.default_tuition_female_per_year ?? null,
                    };
                    const clonedChild = await apiRequest<UnitSummary>(
                        `/api/admin/universities/${universityId}/units`,
                        { method: "POST", body: childPayload },
                    );
                    clonedChildren.push(clonedChild);
                }

                setItems(current => [...current, created, ...clonedChildren]);
                flash(
                    `“${created.name_en}” cloned${clonedChildren.length > 0 ? ` with ${clonedChildren.length} department${clonedChildren.length === 1 ? "" : "s"}` : ""}.`,
                );
                router.refresh();
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Could not clone the unit.");
            }
        });
    }

    function handleUpdateProgram(program: ProgramSummary) {
        return (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const payload = programPayload(new FormData(event.currentTarget)) as ProgramUpdatePayload;
            if (!payload.name_en) {
                setError("Program name (English) is required.");
                return;
            }

            const selectedUnit = items.find(u => String(u.id) === String(payload.unit_id));
            if (selectedUnit) {
                if (selectedUnit.parent_id) {
                    const parent = items.find(u => u.id === selectedUnit.parent_id);
                    payload.faculty = parent ? parent.name_en : selectedUnit.name_en;
                } else {
                    payload.faculty = selectedUnit.name_en;
                }
            }

            startTransition(async () => {
                try {
                    const updated = await apiRequest<ProgramSummary>(`/api/admin/programs/${program.id}`, {
                        method: "PATCH",
                        body: payload,
                    });
                    setLocalPrograms(current => current.map(item => (item.id === updated.id ? updated : item)));
                    setEditingProgram(null);
                    flash(`“${updated.name_en}” updated.`);
                    router.refresh();
                } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "Could not update the program.");
                }
            });
        };
    }

    // --- Tree Hierarchy Assembly ---
    const { rootUnits, childUnitsMap, programsByUnitId, unassignedPrograms, totalDepartmentsCount } = useMemo(() => {
        const root: UnitSummary[] = [];
        const childMap: Record<string, UnitSummary[]> = {};
        const progMap: Record<string, ProgramSummary[]> = {};
        const unassigned: ProgramSummary[] = [];

        // Group units
        let depts = 0;
        for (const unit of items) {
            if (!unit.parent_id) {
                root.push(unit);
            } else {
                const pId = String(unit.parent_id);
                if (!childMap[pId]) childMap[pId] = [];
                childMap[pId].push(unit);
                depts++;
            }
        }

        // Sort root and children
        root.sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name_en.localeCompare(b.name_en));
        for (const pId in childMap) {
            childMap[pId].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name_en.localeCompare(b.name_en));
        }

        // Group programs by unit
        for (const prog of localPrograms) {
            if (prog.unit_id) {
                const uidStr = String(prog.unit_id);
                if (!progMap[uidStr]) progMap[uidStr] = [];
                progMap[uidStr].push(prog);
            } else {
                unassigned.push(prog);
            }
        }

        return {
            rootUnits: root,
            childUnitsMap: childMap,
            programsByUnitId: progMap,
            unassignedPrograms: unassigned,
            totalDepartmentsCount: depts,
        };
    }, [items, localPrograms]);

    // Expand / Collapse all toggle
    const allExpanded = rootUnits.length > 0 && rootUnits.every(u => !collapsedUnits[String(u.id)]);
    function toggleExpandAll() {
        if (allExpanded) {
            const next: Record<string, boolean> = {};
            for (const u of rootUnits) next[String(u.id)] = true;
            setCollapsedUnits(next);
        } else {
            setCollapsedUnits({});
        }
    }

    // Search filter
    const searchTerm = search.trim().toLowerCase();
    const visibleRootUnits = useMemo(() => {
        if (!searchTerm) return rootUnits;

        return rootUnits.filter(unit => {
            const uText = `${unit.name_en} ${unit.name_kh ?? ""} ${unit.kind}`.toLowerCase();
            if (uText.includes(searchTerm)) return true;

            const children = childUnitsMap[String(unit.id)] ?? [];
            const hasMatchingChild = children.some(c =>
                `${c.name_en} ${c.name_kh ?? ""}`.toLowerCase().includes(searchTerm),
            );
            if (hasMatchingChild) return true;

            const unitPrograms = programsByUnitId[String(unit.id)] ?? [];
            const hasMatchingProgram = unitPrograms.some(p =>
                `${p.name_en} ${p.name_kh ?? ""}`.toLowerCase().includes(searchTerm),
            );
            if (hasMatchingProgram) return true;

            // Check programs under child departments
            for (const c of children) {
                const cProgs = programsByUnitId[String(c.id)] ?? [];
                if (cProgs.some(p => `${p.name_en} ${p.name_kh ?? ""}`.toLowerCase().includes(searchTerm))) {
                    return true;
                }
            }

            return false;
        });
    }, [rootUnits, childUnitsMap, programsByUnitId, searchTerm]);

    return (
        <div className="space-y-5">
            {/* Clean Action Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search faculties, departments, or majors…"
                        className="h-8.5 pl-8.5 text-xs bg-background"
                    />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    {rootUnits.length > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8.5 px-3 text-xs gap-1.5"
                            onClick={toggleExpandAll}
                            title={allExpanded ? "Collapse all" : "Expand all"}
                        >
                            {allExpanded ? (
                                <>
                                    <ChevronsDownUp className="size-3.5 text-muted-foreground" />
                                    <span>Collapse all</span>
                                </>
                            ) : (
                                <>
                                    <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                                    <span>Expand all</span>
                                </>
                            )}
                        </Button>
                    )}

                    {!adding && (
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8.5 gap-1.5 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 border-primary/20 shadow-2xs"
                                onClick={() => {
                                    setBatchTargetUnit(null);
                                    setIsBatchOpen(true);
                                }}
                                title="Batch add multiple degree programs"
                            >
                                <Sparkles className="size-3.5" />
                                <span>Batch Programs</span>
                            </Button>
                            <Button
                                size="sm"
                                className="h-8.5 gap-1.5 text-xs shadow-2xs font-medium"
                                onClick={() => {
                                    setAdding(true);
                                    setDefaultParentForNew(null);
                                    setEditingId(null);
                                }}
                            >
                                <Plus className="size-3.5" />
                                Add Faculty
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {error && <Alert>{error}</Alert>}
            {saved && !error && <Alert variant="success">{saved}</Alert>}

            {/* Create unit form */}
            {adding && (
                <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2.5">
                            <Plus className="size-4.5 text-foreground shrink-0" />
                            <div>
                                <h4 className="text-sm font-semibold">
                                    {defaultParentForNew
                                        ? `Add department under “${items.find(u => u.id === defaultParentForNew)?.name_en}”`
                                        : "New Faculty or Primary Unit"}
                                </h4>
                                <p className="text-2xs text-muted-foreground">
                                    Units help organize academic programs and define default tuition fees.
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => {
                                setAdding(false);
                                setDefaultParentForNew(null);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-4">
                        <UnitFields
                            siblings={items}
                            defaultValue={
                                defaultParentForNew
                                    ? ({ parent_id: defaultParentForNew, kind: "DEPARTMENT" } as UnitSummary)
                                    : undefined
                            }
                        />
                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setAdding(false);
                                    setDefaultParentForNew(null);
                                }}
                                disabled={pending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                                value="another"
                                disabled={pending}
                            >
                                {pending ? <Spinner className="size-3.5" /> : null}
                                Save & Add Another
                            </Button>
                            <Button type="submit" size="sm" value="save" disabled={pending}>
                                {pending ? <Spinner className="size-3.5" /> : null}
                                {pending ? "Adding…" : defaultParentForNew ? "Create Department" : "Create Faculty"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Empty state when university has no units */}
            {items.length === 0 && !adding && (
                <EmptyState
                    title="No academic units yet"
                    description="This university is currently configured as a flat institution. Add faculties or departments to organize degrees into an academic hierarchy."
                    action={
                        <Button
                            size="sm"
                            onClick={() => setAdding(true)}
                            className="gap-1.5"
                        >
                            <Plus className="size-4" />
                            Add first faculty
                        </Button>
                    }
                />
            )}

            {/* FRIENDLY HIERARCHY ACCORDION */}
            {visibleRootUnits.length > 0 && (
                <div className="space-y-3.5">
                    {visibleRootUnits.map(unit => (
                        <ParentUnitCard
                            key={unit.id}
                            unit={unit}
                            childrenUnits={childUnitsMap[String(unit.id)] ?? []}
                            unitPrograms={programsByUnitId[String(unit.id)] ?? []}
                            programsByUnitId={programsByUnitId}
                            universityId={universityId}
                            universitySlug={universitySlug}
                            defaultTuitionPerYear={defaultTuitionPerYear}
                            defaultTuitionFemalePerYear={defaultTuitionFemalePerYear}
                            isCollapsed={Boolean(collapsedUnits[String(unit.id)])}
                            isEditing={String(editingId) === String(unit.id)}
                            pending={pending}
                            allUnits={items}
                            onToggleCollapse={toggleCollapse}
                            onStartEdit={setEditingId}
                            onCancelEdit={() => setEditingId(null)}
                            onUpdate={handleUpdate}
                            onClone={handleClone}
                            onDelete={handleDelete}
                            onQuickAdd={u => {
                                setQuickAddUnit(u);
                                setCloningProgram(null);
                            }}
                            onBatchAdd={u => {
                                setBatchTargetUnit(u);
                                setIsBatchOpen(true);
                            }}
                            onAddDepartment={u => {
                                setDefaultParentForNew(u.id);
                                setAdding(true);
                            }}
                            onEditProgram={setEditingProgram}
                            onCloneProgram={p => {
                                setCloningProgram(p);
                                setQuickAddUnit(unit);
                            }}
                            onDeleteProgram={handleDeleteProgram}
                        />
                    ))}
                </div>
            )}

            {/* UNASSIGNED INSTITUTIONAL PROGRAMS (Direct under University) */}
            {unassignedPrograms.length > 0 && (
                <div className="rounded-xl border bg-muted/15 p-4 space-y-3">
                    <div className="flex items-center gap-2.5">
                        <GraduationCap className="size-5 text-foreground shrink-0" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-foreground">
                                    Direct Institutional Programs
                                </h4>
                                <Badge variant="outline" className="text-3xs">
                                    {unassignedPrograms.length} programs
                                </Badge>
                            </div>
                            <p className="text-2xs text-muted-foreground">
                                Programs offered directly at the institution level without a specific faculty.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pt-1">
                        {unassignedPrograms.map(prog => (
                            <ProgramChip
                                key={prog.id}
                                program={prog}
                                unit={null}
                                defaultTuitionPerYear={defaultTuitionPerYear}
                                defaultTuitionFemalePerYear={defaultTuitionFemalePerYear}
                                onEdit={setEditingProgram}
                                onClone={p => {
                                    setCloningProgram(p);
                                    setQuickAddUnit(null);
                                }}
                                onDelete={handleDeleteProgram(prog)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Add or Duplicate Degree Program Modal */}
            <Modal
                isOpen={Boolean(quickAddUnit || cloningProgram)}
                onClose={() => {
                    setQuickAddUnit(null);
                    setCloningProgram(null);
                }}
                title={
                    cloningProgram
                        ? `Duplicate “${cloningProgram.name_en}”`
                        : `Add Program to “${quickAddUnit?.name_en ?? "Unit"}”`
                }
                icon={<Plus className="size-4 text-primary" />}
                maxWidth="max-w-2xl"
            >
                {(quickAddUnit || cloningProgram) && (
                    <form onSubmit={handleCreateProgramSubmit} className="space-y-4">
                        <ProgramFields
                            defaultValue={
                                cloningProgram
                                    ? {
                                        ...cloningProgram,
                                        name_en: `${cloningProgram.name_en} (Copy)`,
                                        name_kh: cloningProgram.name_kh ? `${cloningProgram.name_kh} (ចម្លង)` : null,
                                        unit_id: quickAddUnit?.id ? Number(quickAddUnit.id) : (cloningProgram.unit_id ? Number(cloningProgram.unit_id) : null),
                                    }
                                    : {
                                        unit_id: quickAddUnit?.id ? Number(quickAddUnit.id) : null,
                                    }
                            }
                            units={items}
                            defaultTuitionPerYear={
                                quickAddUnit?.default_tuition_per_year ?? defaultTuitionPerYear
                            }
                        />
                        <div className="flex items-center justify-end gap-2 pt-3 border-t">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setQuickAddUnit(null);
                                    setCloningProgram(null);
                                }}
                                disabled={pending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                                value="another"
                                disabled={pending}
                            >
                                {pending ? <Spinner className="size-3.5" /> : null}
                                Save & Add Another
                            </Button>
                            <Button type="submit" size="sm" value="save" disabled={pending}>
                                {pending ? <Spinner className="size-3.5" /> : null}
                                {pending ? "Adding…" : "Add program"}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Edit Degree Program Modal */}
            <Modal
                isOpen={Boolean(editingProgram)}
                onClose={() => setEditingProgram(null)}
                title={editingProgram ? `Edit “${editingProgram.name_en}”` : "Edit Program"}
                icon={<Pencil className="size-4 text-muted-foreground" />}
                maxWidth="max-w-2xl"
            >
                {editingProgram && (
                    <form onSubmit={handleUpdateProgram(editingProgram)} className="space-y-4">
                        <ProgramFields
                            defaultValue={editingProgram}
                            units={items}
                            defaultTuitionPerYear={defaultTuitionPerYear}
                        />
                        <div className="flex items-center justify-end gap-2 pt-3 border-t">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingProgram(null)}
                                disabled={pending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={pending}>
                                {pending ? <Spinner className="size-3.5" /> : null}
                                {pending ? "Saving…" : "Save program"}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Batch Program Modal */}
            <BatchProgramModal
                isOpen={isBatchOpen}
                onClose={() => setIsBatchOpen(false)}
                universityId={universityId}
                units={items}
                defaultUnitId={batchTargetUnit?.id}
                defaultTuitionPerYear={
                    batchTargetUnit?.default_tuition_per_year ?? defaultTuitionPerYear
                }
                onSuccess={newPrograms => {
                    setLocalPrograms(current => [...current, ...newPrograms]);
                    flash(`Successfully added ${newPrograms.length} programs in batch.`);
                    router.refresh();
                }}
            />
        </div>
    );
}

export { UniversityUnitManager as UnitManager };
export default UniversityUnitManager;

