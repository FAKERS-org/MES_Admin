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
import { apiRequest } from "@/lib/api";
import {
    CURRENCIES,
    DEGREE_LEVELS,
    STUDY_SHIFTS,
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

/** Shared field layout for the create and edit program forms. */
export function ProgramFields({
    defaultValue,
    units,
    defaultTuitionPerYear,
}: {
    defaultValue?: Partial<ProgramSummary>;
    units?: UnitSummary[];
    defaultTuitionPerYear?: number | null;
}) {
    const [selectedUnit, setSelectedUnit] = useState<string>(
        defaultValue?.unit_id ? String(defaultValue.unit_id) : "",
    );

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Program name (English)" htmlFor="p-name" required className="lg:col-span-2">
                <Input
                    id="p-name"
                    name="name_en"
                    placeholder="Bachelor of Computer Science"
                    defaultValue={defaultValue?.name_en ?? ""}
                    required
                />
            </Field>

            <Field label="Program name (Khmer)" htmlFor="p-name-kh">
                <Input id="p-name-kh" name="name_kh" defaultValue={defaultValue?.name_kh ?? ""} />
            </Field>

            {units && units.length > 0 ? (
                <>
                    <Field label="Belongs to Unit / Faculty" htmlFor="p-unit">
                        <Select
                            id="p-unit"
                            name="unit_id"
                            value={selectedUnit}
                            onChange={e => setSelectedUnit(e.target.value)}
                        >
                            <option value="">No unit (University-Wide / Standalone)</option>
                            {units.map(u => {
                                const parent = u.parent_id ? units.find(p => p.id === u.parent_id) : null;
                                const label = parent ? `${parent.name_en} → ${u.name_en}` : u.name_en;
                                return (
                                    <option key={u.id} value={String(u.id)}>
                                        {label} ({u.kind})
                                    </option>
                                );
                            })}
                        </Select>
                    </Field>
                    {!selectedUnit ? (
                        <Field label="Faculty Label (Optional for standalone)" htmlFor="p-faculty">
                            <Input
                                id="p-faculty"
                                name="faculty"
                                placeholder="e.g. Faculty of Engineering"
                                defaultValue={defaultValue?.faculty ?? ""}
                            />
                        </Field>
                    ) : null}
                </>
            ) : (
                <Field label="Faculty (Optional)" htmlFor="p-faculty">
                    <Input
                        id="p-faculty"
                        name="faculty"
                        placeholder="Faculty of Engineering"
                        defaultValue={defaultValue?.faculty ?? ""}
                    />
                </Field>
            )}

            <Field label="Degree level" htmlFor="p-level" required>
                <Select id="p-level" name="degree_level" defaultValue={defaultValue?.degree_level ?? "BACHELOR"}>
                    {DEGREE_LEVELS.map(level => (
                        <option key={level} value={level}>
                            {level}
                        </option>
                    ))}
                </Select>
            </Field>

            <Field label="Duration (years)" htmlFor="p-duration" required>
                <Input
                    id="p-duration"
                    name="duration_years"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="10"
                    defaultValue={defaultValue?.duration_years ?? 4}
                    required
                />
            </Field>

            <Field label="Tuition / year (General / Male)" htmlFor="p-tuition-year">
                <Input
                    id="p-tuition-year"
                    name="tuition_per_year"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 800"
                    defaultValue={defaultValue?.tuition_per_year ?? ""}
                />
                <p className="text-2xs text-muted-foreground mt-1">
                    Leave blank to inherit from Unit or University (
                    {defaultTuitionPerYear ? `$${defaultTuitionPerYear}/yr` : "none configured"}).
                </p>
            </Field>

            <Field label="Tuition / year (Female incentive rate, optional)" htmlFor="p-tuition-female">
                <Input
                    id="p-tuition-female"
                    name="tuition_female_per_year"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 400 (if discounted)"
                    defaultValue={defaultValue?.tuition_female_per_year ?? ""}
                />
            </Field>

            <Field label="Tuition / credit" htmlFor="p-tuition-credit">
                <Input
                    id="p-tuition-credit"
                    name="tuition_per_credit"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={defaultValue?.tuition_per_credit ?? ""}
                />
            </Field>

            <Field label="Currency" htmlFor="p-currency">
                <Select id="p-currency" name="fee_currency" defaultValue={defaultValue?.fee_currency ?? "USD"}>
                    {CURRENCIES.map(currency => (
                        <option key={currency} value={currency}>
                            {currency}
                        </option>
                    ))}
                </Select>
            </Field>

            <div className="sm:col-span-2 lg:col-span-3 space-y-2">
                <label className="text-xs font-medium text-foreground">Study Shifts (វេនសិក្សា)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {STUDY_SHIFTS.map(shift => {
                        const shiftInfo = STUDY_SHIFT_LABELS[shift];
                        const isChecked = defaultValue?.shifts?.includes(shift);
                        return (
                            <label
                                key={shift}
                                className="flex items-start gap-2 rounded-lg border p-2 text-xs hover:bg-muted/40 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    name="shifts"
                                    value={shift}
                                    defaultChecked={isChecked}
                                    className="mt-0.5 rounded border-input text-primary focus:ring-primary"
                                />
                                <div className="min-w-0">
                                    <div className="font-medium text-foreground truncate">
                                        {shiftInfo.kh} ({shiftInfo.en})
                                    </div>
                                    <div className="text-2xs text-muted-foreground">{shiftInfo.time}</div>
                                </div>
                            </label>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

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
        const nameEn = raw(form, "name_en");
        if (!nameEn) {
            setError("Program name (English) is required.");
            return;
        }

        const unitIdRaw = raw(form, "unit_id");
        const unitId = unitIdRaw ? Number(unitIdRaw) : null;
        const selectedUnit = units?.find(u => String(u.id) === unitIdRaw);
        let faculty = nullable(form, "faculty");
        if (selectedUnit) {
            if (selectedUnit.parent_id) {
                const parent = units?.find(u => u.id === selectedUnit.parent_id);
                faculty = parent ? parent.name_en : selectedUnit.name_en;
            } else {
                faculty = selectedUnit.name_en;
            }
        }

        const shifts = form.getAll("shifts") as StudyShift[];

        const payload: ProgramCreatePayload = {
            name_en: nameEn,
            name_kh: nullable(form, "name_kh"),
            faculty,
            unit_id: unitId,
            degree_level: form.get("degree_level") as DegreeLevel,
            duration_years: Number(raw(form, "duration_years") || 4),
            tuition_per_year: numberOrNull(form, "tuition_per_year"),
            tuition_female_per_year: numberOrNull(form, "tuition_female_per_year"),
            tuition_per_credit: numberOrNull(form, "tuition_per_credit"),
            fee_currency: form.get("fee_currency") as Currency,
            shifts: shifts.length > 0 ? shifts : null,
        };

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
            const nameEn = raw(form, "name_en");
            if (!nameEn) {
                setError("Program name (English) is required.");
                return;
            }

            const unitIdRaw = raw(form, "unit_id");
            const unitId = unitIdRaw ? Number(unitIdRaw) : null;
            const selectedUnit = units?.find(u => String(u.id) === unitIdRaw);
            let faculty = nullable(form, "faculty");
            if (selectedUnit) {
                if (selectedUnit.parent_id) {
                    const parent = units?.find(u => u.id === selectedUnit.parent_id);
                    faculty = parent ? parent.name_en : selectedUnit.name_en;
                } else {
                    faculty = selectedUnit.name_en;
                }
            }

            const shifts = form.getAll("shifts") as StudyShift[];

            const payload: ProgramUpdatePayload = {
                name_en: nameEn,
                name_kh: nullable(form, "name_kh"),
                faculty,
                unit_id: unitId,
                degree_level: form.get("degree_level") as DegreeLevel,
                duration_years: Number(raw(form, "duration_years") || 1),
                fee_currency: form.get("fee_currency") as Currency,
                shifts,
            };
            // Only send tuition when the user typed one: an untouched field
            // must not overwrite the stored value.
            const perYear = numberOrNull(form, "tuition_per_year");
            if (perYear !== null) payload.tuition_per_year = perYear;
            const perYearFemale = numberOrNull(form, "tuition_female_per_year");
            if (perYearFemale !== null) payload.tuition_female_per_year = perYearFemale;
            const perCredit = numberOrNull(form, "tuition_per_credit");
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
