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
import UnitFields, { unitPayload } from "@/components/units/unit-fields";
import { BatchProgramModal } from "@/components/programs/batch-program-modal";
import { ProgramFields } from "@/components/universities/program-manager";
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
        const form = new FormData(formElem);
        const isAddAnother = (event.nativeEvent as SubmitEvent)?.submitter?.getAttribute("value") === "another";
        const nameEn = String(form.get("name_en") || "").trim();
        if (!nameEn) {
            setError("Program name (English) is required.");
            return;
        }

        const unitIdRaw = String(form.get("unit_id") || "").trim();
        const unitId = unitIdRaw ? Number(unitIdRaw) : null;
        const selectedUnit = items.find(u => String(u.id) === unitIdRaw);
        let faculty = String(form.get("faculty") || "").trim() || null;
        if (selectedUnit) {
            if (selectedUnit.parent_id) {
                const parent = items.find(u => u.id === selectedUnit.parent_id);
                faculty = parent ? parent.name_en : selectedUnit.name_en;
            } else {
                faculty = selectedUnit.name_en;
            }
        }

        const shifts = form.getAll("shifts") as StudyShift[];

        const payload: ProgramCreatePayload = {
            name_en: nameEn,
            name_kh: String(form.get("name_kh") || "").trim() || null,
            faculty,
            unit_id: unitId,
            degree_level: form.get("degree_level") as DegreeLevel,
            duration_years: Number(form.get("duration_years") || 4),
            tuition_per_year: form.get("tuition_per_year") ? Number(form.get("tuition_per_year")) : null,
            tuition_female_per_year: form.get("tuition_female_per_year") ? Number(form.get("tuition_female_per_year")) : null,
            tuition_per_credit: form.get("tuition_per_credit") ? Number(form.get("tuition_per_credit")) : null,
            fee_currency: form.get("fee_currency") as Currency,
            shifts: shifts.length > 0 ? shifts : null,
        };

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
            const form = new FormData(event.currentTarget);
            const nameEn = String(form.get("name_en") || "").trim();
            if (!nameEn) {
                setError("Program name (English) is required.");
                return;
            }

            const unitIdRaw = String(form.get("unit_id") || "").trim();
            const unitId = unitIdRaw ? Number(unitIdRaw) : null;
            const selectedUnit = items.find(u => String(u.id) === unitIdRaw);
            let faculty = String(form.get("faculty") || "").trim() || null;
            if (selectedUnit) {
                if (selectedUnit.parent_id) {
                    const parent = items.find(u => u.id === selectedUnit.parent_id);
                    faculty = parent ? parent.name_en : selectedUnit.name_en;
                } else {
                    faculty = selectedUnit.name_en;
                }
            }

            const shifts = form.getAll("shifts") as StudyShift[];

            const payload: ProgramUpdatePayload = {
                name_en: nameEn,
                name_kh: String(form.get("name_kh") || "").trim() || null,
                faculty,
                unit_id: unitId,
                degree_level: form.get("degree_level") as DegreeLevel,
                duration_years: Number(form.get("duration_years") || 1),
                fee_currency: form.get("fee_currency") as Currency,
                shifts,
            };
            const perYearRaw = String(form.get("tuition_per_year") || "").trim();
            if (perYearRaw) payload.tuition_per_year = Number(perYearRaw);
            const perYearFemaleRaw = String(form.get("tuition_female_per_year") || "").trim();
            if (perYearFemaleRaw) payload.tuition_female_per_year = Number(perYearFemaleRaw);
            const perCreditRaw = String(form.get("tuition_per_credit") || "").trim();
            if (perCreditRaw) payload.tuition_per_credit = Number(perCreditRaw);

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
                    {visibleRootUnits.map(unit => {
                        const unitIdStr = String(unit.id);
                        const isEditing = String(editingId) === unitIdStr;
                        const children = childUnitsMap[unitIdStr] ?? [];
                        const unitPrograms = programsByUnitId[unitIdStr] ?? [];
                        const isCollapsed = Boolean(collapsedUnits[unitIdStr]);

                        // Compute total programs under this faculty (direct + under departments)
                        let totalPrograms = unitPrograms.length;
                        for (const child of children) {
                            totalPrograms += (programsByUnitId[String(child.id)] ?? []).length;
                        }

                        if (isEditing) {
                            return (
                                <div key={unit.id} className="rounded-xl border border-primary/30 bg-card p-4 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <div className="flex items-center gap-2">
                                            <Pencil className="size-4 text-muted-foreground" />
                                            <h4 className="text-sm font-semibold">Edit “{unit.name_en}”</h4>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs"
                                            onClick={() => setEditingId(null)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                    <form onSubmit={handleUpdate(unit)} className="space-y-4">
                                        <UnitFields defaultValue={unit} siblings={items} />
                                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setEditingId(null)}
                                                disabled={pending}
                                            >
                                                Cancel
                                            </Button>
                                            <Button type="submit" size="sm" disabled={pending}>
                                                {pending ? <Spinner className="size-3.5" /> : null}
                                                {pending ? "Saving…" : "Save changes"}
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={unit.id}
                                className="rounded-xl border border-border/80 bg-card shadow-2xs hover:border-border transition-colors overflow-hidden"
                            >
                                {/* Faculty Header Row */}
                                <div
                                    onClick={() => toggleCollapse(unit.id)}
                                    className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/15 cursor-pointer select-none hover:bg-muted/25 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Expand / Collapse Button */}
                                        <button
                                            type="button"
                                            onClick={e => {
                                                e.stopPropagation();
                                                toggleCollapse(unit.id);
                                            }}
                                            className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
                                            aria-label={isCollapsed ? "Expand" : "Collapse"}
                                        >
                                            <ChevronRight
                                                className={cn(
                                                    "size-4.5 transition-transform duration-200 ease-out",
                                                    isCollapsed ? "rotate-0 text-muted-foreground" : "rotate-90 text-foreground",
                                                )}
                                            />
                                        </button>

                                        {/* Faculty Icon */}
                                        <Building2 className="size-5 text-foreground shrink-0" />

                                        {/* Titles & Metadata */}
                                        <div className="min-w-0 space-y-0.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-sm sm:text-base text-foreground">
                                                    {unit.name_en}
                                                </span>
                                                {unit.name_kh && (
                                                    <span className="text-xs text-muted-foreground font-khmer">
                                                        ({unit.name_kh})
                                                    </span>
                                                )}
                                                <Badge variant="outline" className="text-3xs uppercase tracking-wide px-1.5 py-0">
                                                    {unit.kind.replace(/_/g, " ")}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                                                <span>
                                                    {children.length} {children.length === 1 ? "department" : "departments"} ·{" "}
                                                    {totalPrograms} {totalPrograms === 1 ? "program" : "programs"}
                                                </span>
                                                {unit.default_tuition_per_year ? (
                                                    <span className="text-2xs font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.2 rounded-full">
                                                        Default: ${unit.default_tuition_per_year.toLocaleString()}/yr
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div
                                        onClick={e => e.stopPropagation()}
                                        className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0"
                                    >
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2.5 text-xs font-medium gap-1 rounded-md"
                                            onClick={() => {
                                                setQuickAddUnit(unit);
                                                setCloningProgram(null);
                                            }}
                                            title="Add degree program to this faculty"
                                        >
                                            <Plus className="size-3.5" />
                                            <span>Add Program</span>
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2 text-xs font-medium gap-1 rounded-md text-primary hover:text-primary bg-primary/5 hover:bg-primary/10 border-primary/20"
                                            onClick={() => {
                                                setBatchTargetUnit(unit);
                                                setIsBatchOpen(true);
                                            }}
                                            title="Batch add multiple programs from a list"
                                        >
                                            <Sparkles className="size-3" />
                                            <span>Batch</span>
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2.5 text-xs font-medium gap-1 rounded-md"
                                            onClick={() => {
                                                setDefaultParentForNew(unit.id);
                                                setAdding(true);
                                            }}
                                            title="Add department under this faculty"
                                        >
                                            <Plus className="size-3.5" />
                                            <span>Add Dept</span>
                                        </Button>

                                        <Link
                                            href={`/universities/${universitySlug ?? universityId}/units/${unit.slug ?? unit.id}`}
                                            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                            title="View unit details page"
                                        >
                                            <Layers className="size-3.5" />
                                        </Link>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="size-7 p-0 rounded-md text-muted-foreground hover:text-foreground"
                                            onClick={() => handleClone(unit)}
                                            disabled={pending}
                                            title={`Clone “${unit.name_en}”`}
                                        >
                                            <Copy className="size-3.5" />
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="size-7 p-0 rounded-md text-muted-foreground hover:text-foreground"
                                            onClick={() => setEditingId(unit.id)}
                                            title="Edit faculty"
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
                                </div>

                                {/* Expanded Hierarchy Content with Smooth Dropdown Animation */}
                                <div
                                    className={cn(
                                        "grid transition-[grid-template-rows] duration-200 ease-out",
                                        isCollapsed
                                            ? "grid-rows-[0fr] pointer-events-none"
                                            : "grid-rows-[1fr]",
                                    )}
                                >
                                    <div className="overflow-hidden min-h-0">
                                        <div className="p-4 border-t bg-muted/5 space-y-4">
                                            {/* Child Departments */}
                                            {children.length > 0 && (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                        <FolderTree className="size-3.5 text-muted-foreground" />
                                                        <span>Departments ({children.length})</span>
                                                    </div>

                                                    <div className="grid gap-3 sm:grid-cols-1">
                                                        {children.map(child => {
                                                            const childIdStr = String(child.id);
                                                            const childPrograms = programsByUnitId[childIdStr] ?? [];
                                                            const isChildEditing = String(editingId) === childIdStr;

                                                            if (isChildEditing) {
                                                                return (
                                                                    <div key={child.id} className="p-3.5 bg-card rounded-xl border border-primary/30 shadow-2xs space-y-3">
                                                                        <div className="flex items-center justify-between">
                                                                            <p className="text-xs font-semibold">Edit “{child.name_en}”</p>
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-6 text-xs"
                                                                                onClick={() => setEditingId(null)}
                                                                            >
                                                                                Cancel
                                                                            </Button>
                                                                        </div>
                                                                        <form onSubmit={handleUpdate(child)} className="space-y-3">
                                                                            <UnitFields defaultValue={child} siblings={items} />
                                                                            <div className="flex justify-end gap-2 pt-2 border-t">
                                                                                <Button
                                                                                    type="button"
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    onClick={() => setEditingId(null)}
                                                                                >
                                                                                    Cancel
                                                                                </Button>
                                                                                <Button type="submit" size="sm" disabled={pending}>
                                                                                    {pending ? <Spinner className="size-3" /> : null}
                                                                                    Save
                                                                                </Button>
                                                                            </div>
                                                                        </form>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div
                                                                    key={child.id}
                                                                    className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2.5 shadow-2xs hover:border-border transition-colors"
                                                                >
                                                                    {/* Department Header */}
                                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                                            <FolderTree className="size-4 text-foreground/80 shrink-0" />
                                                                            <div className="min-w-0">
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <span className="font-medium text-xs sm:text-sm text-foreground">
                                                                                        {child.name_en}
                                                                                    </span>
                                                                                    {child.name_kh && (
                                                                                        <span className="text-xs text-muted-foreground font-khmer">
                                                                                            ({child.name_kh})
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-2xs text-muted-foreground">
                                                                                    {childPrograms.length} {childPrograms.length === 1 ? "degree program" : "degree programs"}
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="h-6 px-2 text-2xs font-medium gap-1 rounded-md"
                                                                                onClick={() => {
                                                                                    setQuickAddUnit(child);
                                                                                    setCloningProgram(null);
                                                                                }}
                                                                                title="Add degree program under this department"
                                                                            >
                                                                                <Plus className="size-3" />
                                                                                <span>Add Program</span>
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="h-6 px-1.5 text-2xs font-medium gap-1 rounded-md text-primary hover:text-primary bg-primary/5 hover:bg-primary/10 border-primary/20"
                                                                                onClick={() => {
                                                                                    setBatchTargetUnit(child);
                                                                                    setIsBatchOpen(true);
                                                                                }}
                                                                                title="Batch add multiple programs from a list"
                                                                            >
                                                                                <Sparkles className="size-3" />
                                                                                <span>Batch</span>
                                                                            </Button>
                                                                            <Link
                                                                                href={`/universities/${universitySlug ?? universityId}/units/${child.slug ?? child.id}`}
                                                                                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                                                title="View department details page"
                                                                            >
                                                                                <Layers className="size-3" />
                                                                            </Link>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="size-6 p-0 rounded-md text-muted-foreground hover:text-foreground"
                                                                                onClick={() => handleClone(child)}
                                                                                disabled={pending}
                                                                                title={`Clone “${child.name_en}”`}
                                                                            >
                                                                                <Copy className="size-3" />
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="size-6 p-0 rounded-md text-muted-foreground hover:text-foreground"
                                                                                onClick={() => setEditingId(child.id)}
                                                                                title="Edit department"
                                                                            >
                                                                                <Pencil className="size-3" />
                                                                            </Button>
                                                                            <ConfirmButton
                                                                                onConfirm={handleDelete(child)}
                                                                                confirmLabel={`Delete “${child.name_en}”?`}
                                                                                title={`Delete “${child.name_en}”`}
                                                                                className="size-6 p-0 rounded-md"
                                                                            >
                                                                                <Trash2 className="size-3" />
                                                                            </ConfirmButton>
                                                                        </div>
                                                                    </div>

                                                                    {/* Department Programs */}
                                                                    {childPrograms.length > 0 ? (
                                                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pt-1">
                                                                            {childPrograms.map(prog => (
                                                                                <ProgramChip
                                                                                    key={prog.id}
                                                                                    program={prog}
                                                                                    unit={child}
                                                                                    defaultTuitionPerYear={defaultTuitionPerYear}
                                                                                    defaultTuitionFemalePerYear={defaultTuitionFemalePerYear}
                                                                                    onEdit={setEditingProgram}
                                                                                    onClone={p => {
                                                                                        setCloningProgram(p);
                                                                                        setQuickAddUnit(child);
                                                                                    }}
                                                                                    onDelete={handleDeleteProgram(prog)}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 rounded-lg border border-dashed bg-muted/20 text-2xs text-muted-foreground">
                                                                            <span>No degree programs under this department yet.</span>
                                                                            <div className="flex items-center gap-1">
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    className="h-6 text-3xs gap-1"
                                                                                    onClick={() => {
                                                                                        setQuickAddUnit(child);
                                                                                        setCloningProgram(null);
                                                                                    }}
                                                                                >
                                                                                    <Plus className="size-2.5" />
                                                                                    Add Program
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    className="h-6 text-3xs gap-1 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
                                                                                    onClick={() => {
                                                                                        setBatchTargetUnit(child);
                                                                                        setIsBatchOpen(true);
                                                                                    }}
                                                                                >
                                                                                    <Sparkles className="size-2.5" />
                                                                                    Batch
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Direct Programs under Faculty (Common in Cambodia) */}
                                            {unitPrograms.length > 0 && (
                                                <div className="space-y-2.5">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                            <GraduationCap className="size-3.5 text-muted-foreground" />
                                                            <span>
                                                                {children.length > 0 ? "Direct Faculty Programs" : "Degree Programs"} ({unitPrograms.length})
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-6 px-2 text-2xs font-medium gap-1"
                                                                onClick={() => {
                                                                    setQuickAddUnit(unit);
                                                                    setCloningProgram(null);
                                                                }}
                                                            >
                                                                <Plus className="size-3" />
                                                                <span>Add Program</span>
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-6 px-1.5 text-2xs font-medium gap-1 text-primary hover:text-primary bg-primary/5 hover:bg-primary/10 border-primary/20"
                                                                onClick={() => {
                                                                    setBatchTargetUnit(unit);
                                                                    setIsBatchOpen(true);
                                                                }}
                                                            >
                                                                <Sparkles className="size-3" />
                                                                <span>Batch</span>
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                        {unitPrograms.map(prog => (
                                                            <ProgramChip
                                                                key={prog.id}
                                                                program={prog}
                                                                unit={unit}
                                                                defaultTuitionPerYear={defaultTuitionPerYear}
                                                                defaultTuitionFemalePerYear={defaultTuitionFemalePerYear}
                                                                onEdit={setEditingProgram}
                                                                onClone={p => {
                                                                    setCloningProgram(p);
                                                                    setQuickAddUnit(unit);
                                                                }}
                                                                onDelete={handleDeleteProgram(prog)}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Empty state for leaf faculty with no departments and no programs */}
                                            {children.length === 0 && unitPrograms.length === 0 && (
                                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border border-dashed bg-muted/20 text-xs text-muted-foreground">
                                                    <span>No departments or degree programs assigned to this faculty yet.</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs gap-1"
                                                            onClick={() => {
                                                                setQuickAddUnit(unit);
                                                                setCloningProgram(null);
                                                            }}
                                                        >
                                                            <Plus className="size-3" />
                                                            Add Program
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs gap-1 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
                                                            onClick={() => {
                                                                setBatchTargetUnit(unit);
                                                                setIsBatchOpen(true);
                                                            }}
                                                        >
                                                            <Sparkles className="size-3" />
                                                            Batch
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs gap-1"
                                                            onClick={() => {
                                                                setDefaultParentForNew(unit.id);
                                                                setAdding(true);
                                                            }}
                                                        >
                                                            <Plus className="size-3" />
                                                            Add Dept
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
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

/** Clean, friendly program chip with degree badge and tuition */
function ProgramChip({
    program,
    unit,
    defaultTuitionPerYear,
    defaultTuitionFemalePerYear,
    onEdit,
    onClone,
    onDelete,
}: {
    program: ProgramSummary;
    unit: UnitSummary | null;
    defaultTuitionPerYear?: number | null;
    defaultTuitionFemalePerYear?: number | null;
    onEdit?: (program: ProgramSummary) => void;
    onClone?: (program: ProgramSummary) => void;
    onDelete?: () => void;
}) {
    const resolved = resolveProgramTuition(
        program,
        unit,
        defaultTuitionPerYear,
        defaultTuitionFemalePerYear,
    );

    return (
        <div className="group flex items-center justify-between gap-2.5 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
                <GraduationCap className="size-4 text-foreground/80 shrink-0" />
                <div className="min-w-0">
                    <p className="font-medium text-xs text-foreground truncate" title={program.name_en}>
                        {program.name_en}
                    </p>
                    {program.name_kh && (
                        <p className="text-3xs text-muted-foreground font-khmer truncate">
                            {program.name_kh}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-3xs uppercase font-medium px-1.5 py-0">
                            {program.degree_level}
                        </Badge>
                        <span className="font-semibold text-xs text-foreground">
                            {formatCurrency(resolved.effectiveTuition, program.fee_currency)}/yr
                        </span>
                    </div>
                    {resolved.effectiveFemale && (
                        <span className="text-rose-600 dark:text-rose-400 font-medium text-3xs">
                            ♀ {formatCurrency(resolved.effectiveFemale, program.fee_currency)}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-0.5">
                    {onClone && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="size-6 p-0 rounded-md text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                            onClick={e => {
                                e.stopPropagation();
                                onClone(program);
                            }}
                            title={`Duplicate ${program.name_en}`}
                        >
                            <Copy className="size-3" />
                        </Button>
                    )}

                    {onEdit && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="size-6 p-0 rounded-md text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                            onClick={e => {
                                e.stopPropagation();
                                onEdit(program);
                            }}
                            title={`Edit ${program.name_en}`}
                        >
                            <Pencil className="size-3" />
                        </Button>
                    )}

                    {onDelete && (
                        <ConfirmButton
                            onConfirm={onDelete}
                            confirmLabel={`Delete “${program.name_en}”?`}
                            title={`Delete “${program.name_en}”`}
                            className="size-6 p-0 rounded-md"
                        >
                            <Trash2 className="size-3" />
                        </ConfirmButton>
                    )}
                </div>
            </div>
        </div>
    );
}
