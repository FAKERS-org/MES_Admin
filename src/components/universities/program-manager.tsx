"use client";

import { Copy, GraduationCap, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmButton from "@/components/ui/confirm-button";
import { Alert, EmptyState, Spinner } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { BatchProgramModal } from "@/components/programs/batch-program-modal";
import ProgramFields, { programPayload, numberOrNull } from "@/components/programs/program-fields";
import { apiRequest } from "@/lib/api";
import {
    DEGREE_LEVELS,
    STUDY_SHIFT_LABELS,
    type Currency,
    type DegreeLevel,
    type ProgramCreatePayload,
    type ProgramSummary,
    type ProgramUpdatePayload,
    type StudyShift,
    type UnitSummary,
} from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { resolveProgramTuition } from "@/lib/tuition";

export { ProgramFields };

export default function ProgramManager({
    universityId,
    programs,
    units,
    defaultTuitionPerYear,
    defaultTuitionFemalePerYear,
}: {
    universityId: string;
    programs: ProgramSummary[];
    units?: UnitSummary[];
    defaultTuitionPerYear?: number | null;
    defaultTuitionFemalePerYear?: number | null;
}) {
    const router = useRouter();
    const [items, setItems] = useState<ProgramSummary[]>(programs);
    const [search, setSearch] = useState("");
    const [degreeFilter, setDegreeFilter] = useState("");
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [cloningProgram, setCloningProgram] = useState<ProgramSummary | null>(null);
    const [isBatchOpen, setIsBatchOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    // Keep local rows in sync when the server component refetches after router.refresh().
    useEffect(() => setItems(programs), [programs]);

    const displayedItems = useMemo(() => {
        return items.filter(p => {
            if (degreeFilter && p.degree_level !== degreeFilter) return false;
            if (search) {
                const term = search.toLowerCase();
                const text = `${p.name_en} ${p.name_kh ?? ""} ${p.faculty ?? ""}`.toLowerCase();
                if (!text.includes(term)) return false;
            }
            return true;
        });
    }, [items, search, degreeFilter]);

    function flash(message: string) {
        setSaved(message);
        setError(null);
    }

    function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formElem = event.currentTarget;
        const form = new FormData(formElem);
        const isAddAnother = (event.nativeEvent as SubmitEvent)?.submitter?.getAttribute("value") === "another";
        const payload = programPayload(form, units);
        if (!payload.name_en) {
            setError("Program name (English) is required.");
            return;
        }

        startTransition(async () => {
            try {
                const created = await apiRequest<ProgramSummary>(`/api/admin/universities/${universityId}/programs`, {
                    method: "POST",
                    body: payload,
                });
                setItems(current => [...current, created]);
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
                    setAdding(false);
                    setCloningProgram(null);
                }
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Could not add the program.");
            }
        });
    }

    function handleUpdate(program: ProgramSummary) {
        return (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const basePayload = programPayload(form, units);
            if (!basePayload.name_en) {
                setError("Program name (English) is required.");
                return;
            }

            const payload: ProgramUpdatePayload = {
                ...basePayload,
            };
            // Only send tuition when the user typed one: an untouched field
            // must not overwrite the stored value.
            const perYear = numberOrNull(form, "tuition_per_year");
            if (perYear !== null) payload.tuition_per_year = perYear;
            const perYearFemale = numberOrNull(form, "tuition_female_per_year");
            if (perYearFemale !== null) payload.tuition_female_per_year = perYearFemale;
            const perCredit = numberOrNull(form, "tuition_per_credit");
            if (perCredit !== null) payload.tuition_per_credit = perCredit;
            if (perCredit !== null) payload.tuition_per_credit = perCredit;

            startTransition(async () => {
                try {
                    const updated = await apiRequest<ProgramSummary>(`/api/admin/programs/${program.id}`, {
                        method: "PATCH",
                        body: payload,
                    });
                    setItems(current => current.map(item => (item.id === updated.id ? updated : item)));
                    setEditingId(null);
                    flash(`“${updated.name_en}” updated.`);
                    router.refresh();
                } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "Could not update the program.");
                }
            });
        };
    }

    function handleDelete(program: ProgramSummary) {
        return async () => {
            try {
                await apiRequest(`/api/admin/programs/${program.id}`, { method: "DELETE" });
                setItems(current => current.filter(item => item.id !== program.id));
                flash(`“${program.name_en}” deleted.`);
                router.refresh();
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Could not delete the program.");
            }
        };
    }

    return (
        <div className="space-y-4">
            {/* Action Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 flex-1 max-w-lg">
                    <div className="relative min-w-48 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Filter programs or faculties…"
                            className="h-8.5 pl-8.5 text-xs bg-background"
                        />
                    </div>
                    <Select
                        value={degreeFilter}
                        onChange={e => setDegreeFilter(e.target.value)}
                        className="h-8.5 w-36 text-xs bg-background"
                    >
                        <option value="">All degrees</option>
                        {DEGREE_LEVELS.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </Select>
                    {(search || degreeFilter) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSearch(""); setDegreeFilter(""); }}
                            className="h-8.5 text-xs"
                        >
                            Reset
                        </Button>
                    )}
                </div>

                {!adding && (
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8.5 gap-1.5 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 border-primary/20 shadow-2xs"
                            onClick={() => setIsBatchOpen(true)}
                        >
                            <Sparkles className="size-3.5" />
                            Batch Add
                        </Button>
                        <Button
                            size="sm"
                            className="h-8.5 gap-1.5 text-xs shadow-2xs font-medium"
                            onClick={() => {
                                setAdding(true);
                                setEditingId(null);
                                setCloningProgram(null);
                            }}
                        >
                            <Plus className="size-3.5" />
                            Add Program
                        </Button>
                    </div>
                )}
            </div>

            {error ? <Alert>{error}</Alert> : null}
            {saved && !error ? <Alert variant="success">{saved}</Alert> : null}

            {adding ? (
                <form onSubmit={handleCreate} className="space-y-4 rounded-xl border bg-muted/30 p-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <p className="text-sm font-semibold">
                            {cloningProgram ? `Duplicate program based on “${cloningProgram.name_en}”` : "New degree program"}
                        </p>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => {
                                setAdding(false);
                                setCloningProgram(null);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                    <ProgramFields
                        defaultValue={
                            cloningProgram
                                ? {
                                      ...cloningProgram,
                                      name_en: `${cloningProgram.name_en} (Copy)`,
                                      name_kh: cloningProgram.name_kh ? `${cloningProgram.name_kh} (ចម្លង)` : null,
                                  }
                                : undefined
                        }
                        units={units}
                        defaultTuitionPerYear={defaultTuitionPerYear}
                    />
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                setAdding(false);
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
            ) : null}

            {items.length === 0 && !adding ? (
                <EmptyState
                    title="No programs yet"
                    description="Add the degree programs this university offers so students can compare them."
                    action={
                        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                            <Plus className="size-4" />
                            Add program
                        </Button>
                    }
                />
            ) : null}


            {items.length > 0 ? (
                <div className="divide-y rounded-xl border">
                    {displayedItems.length === 0 ? (
                        <p className="p-4 text-center text-xs text-muted-foreground">No matching programs found.</p>
                    ) : (
                        displayedItems.map(program => {
                            const matchedUnit = units?.find(u =>
                                program.unit_id
                                    ? String(u.id) === String(program.unit_id)
                                    : Boolean(program.faculty && u.name_en.toLowerCase() === program.faculty.toLowerCase()),
                            );
                            const resolved = resolveProgramTuition(
                                program,
                                matchedUnit,
                                defaultTuitionPerYear,
                                defaultTuitionFemalePerYear,
                            );

                            return editingId === program.id ? (
                                <form
                                    key={program.id}
                                    onSubmit={handleUpdate(program)}
                                    className="space-y-4 bg-muted/30 p-4"
                                >
                                    <p className="text-sm font-medium">Edit “{program.name_en}”</p>
                                    <ProgramFields defaultValue={program} units={units} defaultTuitionPerYear={defaultTuitionPerYear} />
                                    <div className="flex gap-2">
                                        <Button type="submit" size="sm" disabled={pending}>
                                            {pending ? <Spinner className="size-3.5" /> : null}
                                            {pending ? "Saving…" : "Save program"}
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
                                <div key={program.id} className="flex flex-wrap items-center gap-3 p-3.5">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                            {program.name_en}
                                            {program.name_kh ? (
                                                <span className="ml-2 font-normal text-muted-foreground">
                                                    · {program.name_kh}
                                                </span>
                                            ) : null}
                                        </p>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                            <span>
                                                {[
                                                    matchedUnit?.name_en ?? program.faculty ?? "No unit",
                                                    `${program.duration_years ?? "—"} yr`,
                                                ].join(" · ")}
                                            </span>
                                            <span>·</span>
                                            <span
                                                className={cn(
                                                    resolved.source === "program"
                                                        ? "font-semibold text-foreground"
                                                        : "text-muted-foreground",
                                                )}
                                            >
                                                {formatCurrency(resolved.effectiveTuition, program.fee_currency)}/yr
                                            </span>
                                            <span
                                                className={cn(
                                                    "rounded px-1 text-2xs",
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
                                                      ? `⮑ ${matchedUnit?.name_en ?? "Unit"}`
                                                      : resolved.source === "university"
                                                        ? "⮑ Univ default"
                                                        : "Unset"}
                                            </span>
                                            {resolved.effectiveFemale ? (
                                                <span className="text-rose-600 dark:text-rose-400 font-medium text-2xs">
                                                    (♀ {formatCurrency(resolved.effectiveFemale, program.fee_currency)}
                                                    {resolved.discountPercent ? ` · -${resolved.discountPercent}%` : ""})
                                                </span>
                                            ) : null}
                                        </div>
                                        {program.shifts && program.shifts.length > 0 ? (
                                            <div className="mt-1 flex flex-wrap items-center gap-1">
                                                {program.shifts.map(shift => {
                                                    const shiftInfo = STUDY_SHIFT_LABELS[shift];
                                                    return (
                                                        <span
                                                            key={shift}
                                                            className="inline-flex items-center rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-1.5 py-0.5 text-[10px] font-medium"
                                                            title={shiftInfo ? `${shiftInfo.en} (${shiftInfo.time})` : shift}
                                                        >
                                                            {shiftInfo ? `${shiftInfo.kh}` : shift}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        ) : null}
                                    </div>

                                    <Badge variant="outline">{program.degree_level}</Badge>

                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                            onClick={() => {
                                                setCloningProgram(program);
                                                setAdding(true);
                                                setEditingId(null);
                                                window.scrollTo({ top: 0, behavior: "smooth" });
                                            }}
                                            title={`Duplicate ${program.name_en}`}
                                        >
                                            <Copy className="size-3.5" />
                                            <span>Duplicate</span>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setEditingId(program.id);
                                                setAdding(false);
                                                setCloningProgram(null);
                                            }}
                                            aria-label={`Edit ${program.name_en}`}
                                        >
                                            <Pencil className="size-3.5" />
                                            Edit
                                        </Button>
                                        <ConfirmButton
                                            onConfirm={handleDelete(program)}
                                            confirmLabel={`Delete “${program.name_en}”?`}
                                        >
                                            <Trash2 className="size-3.5" />
                                            Delete
                                        </ConfirmButton>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : null}

            {/* Batch Program Creator Modal */}
            <BatchProgramModal
                isOpen={isBatchOpen}
                onClose={() => setIsBatchOpen(false)}
                universityId={universityId}
                units={units}
                defaultTuitionPerYear={defaultTuitionPerYear}
                onSuccess={newPrograms => {
                    setItems(current => [...current, ...newPrograms]);
                    flash(`Successfully added ${newPrograms.length} programs in batch.`);
                    router.refresh();
                }}
            />
        </div>
    );
}
