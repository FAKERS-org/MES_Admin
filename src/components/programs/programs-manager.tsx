"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, GraduationCap, Pencil, Plus, Search, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ConfirmButton from "@/components/ui/confirm-button";
import { Alert, EmptyState, PageHeader } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BatchProgramModal } from "@/components/programs/batch-program-modal";
import { apiRequest } from "@/lib/api";
import {
    CURRENCIES,
    DEGREE_LEVELS,
    STUDY_SHIFTS,
    STUDY_SHIFT_LABELS,
    type Currency,
    type DegreeLevel,
    type Page,
    type ProgramCreatePayload,
    type ProgramListItem,
    type ProgramUpdatePayload,
    type StudyShift,
    type UnitSummary,
    type UniversitySummary,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

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

export function ProgramsManager({
    initialPrograms,
    universities,
}: {
    initialPrograms: ProgramListItem[];
    universities: UniversitySummary[];
}) {
    const router = useRouter();
    const [, startTransition] = useTransition();

    const [search, setSearch] = useState("");
    const [degreeFilter, setDegreeFilter] = useState("");
    const [shiftFilter, setShiftFilter] = useState("");
    const [uniFilter, setUniFilter] = useState("");
    const [facultyFilter, setFacultyFilter] = useState("");
    const [tuitionFilter, setTuitionFilter] = useState("");

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingProgram, setEditingProgram] = useState<ProgramListItem | null>(null);
    const [cloningProgram, setCloningProgram] = useState<ProgramListItem | null>(null);
    const [isBatchOpen, setIsBatchOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<string | null>(null);

    const [createUniId, setCreateUniId] = useState("");
    const [createUnitId, setCreateUnitId] = useState("");
    const [editUnitId, setEditUnitId] = useState("");
    const [unitsCache, setUnitsCache] = useState<Record<string, UnitSummary[]>>({});
    const [loadingUnits, setLoadingUnits] = useState(false);

    const fetchUnits = async (uniId: string | number) => {
        const key = String(uniId);
        if (!key || unitsCache[key]) return;
        setLoadingUnits(true);
        try {
            const res = await apiRequest<Page<UnitSummary> | UnitSummary[]>(
                `/api/admin/universities/${key}/units?limit=100`
            );
            const list = Array.isArray(res) ? res : (res?.items ?? []);
            setUnitsCache((prev) => ({ ...prev, [key]: list }));
        } catch {
            setUnitsCache((prev) => ({ ...prev, [key]: [] }));
        } finally {
            setLoadingUnits(false);
        }
    };

    useEffect(() => {
        if (editingProgram) {
            setEditUnitId(editingProgram.unit_id ? String(editingProgram.unit_id) : "");
            if (editingProgram.university_id) {
                fetchUnits(editingProgram.university_id);
            }
        }
    }, [editingProgram]);

    const createUnits = createUniId ? unitsCache[createUniId] ?? [] : [];
    const editUnits = editingProgram?.university_id ? unitsCache[String(editingProgram.university_id)] ?? [] : [];

    const availableFaculties = useMemo(() => {
        const set = new Set<string>();
        for (const p of initialPrograms) {
            if (p.faculty) set.add(p.faculty);
        }
        return Array.from(set).sort();
    }, [initialPrograms]);

    const filtered = initialPrograms.filter((p) => {
        if (degreeFilter && p.degree_level !== degreeFilter) return false;
        if (shiftFilter && !p.shifts?.includes(shiftFilter as StudyShift)) return false;
        if (uniFilter && String(p.university_id) !== uniFilter) return false;
        if (facultyFilter && p.faculty !== facultyFilter) return false;
        if (tuitionFilter === "DISCOUNT" && !p.tuition_female_per_year) return false;
        if (tuitionFilter === "FREE" && (p.tuition_per_year ?? 0) > 0) return false;
        if (tuitionFilter === "PAID" && !(p.tuition_per_year && p.tuition_per_year > 0)) return false;
        if (tuitionFilter === "UNDER_1000" && (!p.tuition_per_year || p.tuition_per_year > 1000)) return false;
        if (tuitionFilter === "OVER_1000" && (!p.tuition_per_year || p.tuition_per_year <= 1000)) return false;

        if (search) {
            const term = search.toLowerCase();
            const text = `${p.name_en} ${p.name_kh ?? ""} ${p.faculty ?? ""} ${p.unit_name ?? ""} ${p.university_name ?? ""}`.toLowerCase();
            if (!text.includes(term)) return false;
        }
        return true;
    });

    const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setCreateSuccess(null);
        const formElem = e.currentTarget;
        const isAddAnother = (e.nativeEvent as SubmitEvent)?.submitter?.getAttribute("value") === "another";
        const form = new FormData(formElem);
        const universityId = raw(form, "university_id");

        if (!universityId) {
            setError("Please select a university.");
            return;
        }

        const nameEn = raw(form, "name_en");
        if (!nameEn) {
            setError("Program name (English) is required.");
            return;
        }

        const unitIdRaw = raw(form, "unit_id");
        const unitId = unitIdRaw ? Number(unitIdRaw) : null;
        const selectedUnit = createUnits.find((u) => String(u.id) === unitIdRaw);
        let faculty = nullable(form, "faculty");
        if (selectedUnit) {
            if (selectedUnit.parent_id) {
                const parent = createUnits.find((u) => u.id === selectedUnit.parent_id);
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
            degree_level: raw(form, "degree_level") as DegreeLevel,
            duration_years: Number(raw(form, "duration_years")) || 4,
            tuition_per_year: numberOrNull(form, "tuition_per_year"),
            tuition_female_per_year: numberOrNull(form, "tuition_female_per_year"),
            tuition_per_credit: numberOrNull(form, "tuition_per_credit"),
            fee_currency: (raw(form, "fee_currency") as Currency) || "USD",
            shifts: shifts.length > 0 ? shifts : null,
            language_track: nullable(form, "language_track"),
            cqf_level: nullable(form, "cqf_level"),
            field_of_study: nullable(form, "field_of_study"),
        };

        try {
            await apiRequest(`/api/admin/universities/${universityId}/programs`, {
                method: "POST",
                body: payload,
            });
            startTransition(() => router.refresh());

            if (isAddAnother) {
                setCreateSuccess(`“${payload.name_en}” created successfully! Add another below.`);
                const nameEnInput = formElem.querySelector<HTMLInputElement>("#create-name-en");
                const nameKhInput = formElem.querySelector<HTMLInputElement>("#create-name-kh");
                if (nameEnInput) {
                    nameEnInput.value = "";
                    nameEnInput.focus();
                }
                if (nameKhInput) nameKhInput.value = "";
            } else {
                setIsCreateOpen(false);
                setCloningProgram(null);
                setCreateUniId("");
                setCreateUnitId("");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create program");
        }
    };

    const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingProgram) return;
        setError(null);
        const form = new FormData(e.currentTarget);

        const unitIdRaw = raw(form, "unit_id");
        const unitId = unitIdRaw ? Number(unitIdRaw) : null;
        const selectedUnit = editUnits.find((u) => String(u.id) === unitIdRaw);
        let faculty = nullable(form, "faculty");
        if (selectedUnit) {
            if (selectedUnit.parent_id) {
                const parent = editUnits.find((u) => u.id === selectedUnit.parent_id);
                faculty = parent ? parent.name_en : selectedUnit.name_en;
            } else {
                faculty = selectedUnit.name_en;
            }
        }

        const shifts = form.getAll("shifts") as StudyShift[];

        const payload: ProgramUpdatePayload = {
            name_en: raw(form, "name_en"),
            name_kh: nullable(form, "name_kh"),
            faculty,
            unit_id: unitId,
            degree_level: raw(form, "degree_level") as DegreeLevel,
            duration_years: Number(raw(form, "duration_years")) || 4,
            tuition_per_year: numberOrNull(form, "tuition_per_year"),
            tuition_female_per_year: numberOrNull(form, "tuition_female_per_year"),
            tuition_per_credit: numberOrNull(form, "tuition_per_credit"),
            fee_currency: (raw(form, "fee_currency") as Currency) || "USD",
            shifts,
            language_track: nullable(form, "language_track"),
            cqf_level: nullable(form, "cqf_level"),
            field_of_study: nullable(form, "field_of_study"),
        };

        try {
            await apiRequest(`/api/admin/programs/${editingProgram.id}`, {
                method: "PATCH",
                body: payload,
            });
            setEditingProgram(null);
            startTransition(() => router.refresh());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to update program");
        }
    };

    const handleDelete = async (id: string | number) => {
        setError(null);
        try {
            await apiRequest(`/api/admin/programs/${id}`, { method: "DELETE" });
            startTransition(() => router.refresh());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to delete program");
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={<h1 className="text-2xl font-semibold tracking-tight">Academic Programs</h1>}
                subtitle={`${filtered.length} of ${initialPrograms.length} programs match the current filters.`}
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            className="gap-1.5 text-primary bg-primary/5 hover:bg-primary/10 border-primary/20 shadow-2xs"
                            onClick={() => setIsBatchOpen(true)}
                        >
                            <Sparkles className="size-4" />
                            Batch Add
                        </Button>
                        <Button
                            onClick={() => {
                                setCloningProgram(null);
                                setCreateSuccess(null);
                                setIsCreateOpen(true);
                            }}
                            className="gap-1.5"
                        >
                            <Plus className="size-4" />
                            New program
                        </Button>
                    </div>
                }
            />

            {error ? (
                <Alert variant="destructive">
                    <div className="flex items-center justify-between">
                        <span>{error}</span>
                        <Button variant="ghost" size="sm" onClick={() => setError(null)}>✕</Button>
                    </div>
                </Alert>
            ) : null}

            {/* Filter Bar */}
            <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
                <div className="min-w-56 flex-1 space-y-1.5">
                    <label htmlFor="p-search" className="text-xs font-medium text-muted-foreground">Search</label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="p-search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Program name, faculty, or university…"
                            className="pl-8"
                        />
                    </div>
                </div>

                <div className="w-48 space-y-1.5">
                    <label htmlFor="p-uni" className="text-xs font-medium text-muted-foreground">University</label>
                    <Select id="p-uni" value={uniFilter} onChange={(e) => setUniFilter(e.target.value)}>
                        <option value="">All universities</option>
                        {universities.map((u) => (
                            <option key={u.id} value={String(u.id)}>{u.name_en}</option>
                        ))}
                    </Select>
                </div>

                <div className="w-40 space-y-1.5">
                    <label htmlFor="p-degree" className="text-xs font-medium text-muted-foreground">Degree Level</label>
                    <Select id="p-degree" value={degreeFilter} onChange={(e) => setDegreeFilter(e.target.value)}>
                        <option value="">All degrees</option>
                        {DEGREE_LEVELS.map((level) => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </Select>
                </div>

                <div className="w-44 space-y-1.5">
                    <label htmlFor="p-shift" className="text-xs font-medium text-muted-foreground">Study Shift</label>
                    <Select id="p-shift" value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
                        <option value="">All shifts</option>
                        {STUDY_SHIFTS.map((shift) => (
                            <option key={shift} value={shift}>
                                {STUDY_SHIFT_LABELS[shift].kh} ({STUDY_SHIFT_LABELS[shift].en})
                            </option>
                        ))}
                    </Select>
                </div>

                {availableFaculties.length > 0 && (
                    <div className="w-48 space-y-1.5">
                        <label htmlFor="p-fac" className="text-xs font-medium text-muted-foreground">Faculty</label>
                        <Select id="p-fac" value={facultyFilter} onChange={(e) => setFacultyFilter(e.target.value)}>
                            <option value="">All faculties</option>
                            {availableFaculties.map((fac) => (
                                <option key={fac} value={fac}>{fac}</option>
                            ))}
                        </Select>
                    </div>
                )}

                <div className="w-44 space-y-1.5">
                    <label htmlFor="p-fee" className="text-xs font-medium text-muted-foreground">Tuition / Fee</label>
                    <Select id="p-fee" value={tuitionFilter} onChange={(e) => setTuitionFilter(e.target.value)}>
                        <option value="">All tuitions</option>
                        <option value="DISCOUNT">♀ Female Discount</option>
                        <option value="FREE">Free / Unset</option>
                        <option value="PAID">Paid (&gt; $0)</option>
                        <option value="UNDER_1000">&le; $1,000 / yr</option>
                        <option value="OVER_1000">&gt; $1,000 / yr</option>
                    </Select>
                </div>

                {(search || degreeFilter || shiftFilter || uniFilter || facultyFilter || tuitionFilter) ? (
                    <Button variant="ghost" onClick={() => { setSearch(""); setDegreeFilter(""); setShiftFilter(""); setUniFilter(""); setFacultyFilter(""); setTuitionFilter(""); }}>
                        Reset
                    </Button>
                ) : null}
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {filtered.length === 0 ? (
                        <div className="p-6">
                            <EmptyState
                                title="No programs found"
                                description="Try adjusting your search filters or create a new program."
                                action={
                                    <Button onClick={() => setIsCreateOpen(true)} variant="outline" size="sm">
                                        <Plus className="size-4" />
                                        New program
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Program</TableHead>
                                    <TableHead>University</TableHead>
                                    <TableHead>Degree</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Tuition</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((program) => (
                                    <TableRow key={program.id}>
                                        <TableCell>
                                            <div className="font-medium">{program.name_en}</div>
                                            {program.name_kh ? (
                                                <div className="text-xs text-muted-foreground">{program.name_kh}</div>
                                            ) : null}
                                            {program.unit_name ? (
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    Unit: {program.unit_name} {program.faculty && program.faculty !== program.unit_name ? `(${program.faculty})` : ""}
                                                </div>
                                            ) : program.faculty ? (
                                                <div className="text-xs text-muted-foreground/80 mt-0.5">Faculty: {program.faculty}</div>
                                            ) : null}
                                            {program.shifts && program.shifts.length > 0 ? (
                                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                                    {program.shifts.map((s) => (
                                                        <span
                                                            key={s}
                                                            className="inline-flex items-center rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-1 py-0.2 text-[10px] font-medium"
                                                            title={STUDY_SHIFT_LABELS[s]?.time}
                                                        >
                                                            {STUDY_SHIFT_LABELS[s]?.kh ?? s}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell>
                                            {program.university_id ? (
                                                <Link href={`/universities/${program.university_id}`} className="font-medium text-primary hover:underline">
                                                    {program.university_name ?? `University #${program.university_id}`}
                                                </Link>
                                            ) : <span className="text-muted-foreground">—</span>}
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{program.degree_level}</Badge></TableCell>
                                        <TableCell className="text-muted-foreground">{program.duration_years ? `${program.duration_years} yrs` : "—"}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {program.tuition_per_year ? (
                                                <div>
                                                    <div>{formatCurrency(program.tuition_per_year, program.fee_currency)}/yr</div>
                                                    {program.tuition_female_per_year ? (
                                                        <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                                                            ♀ {formatCurrency(program.tuition_female_per_year, program.fee_currency)}/yr
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : program.tuition_per_credit ? (
                                                `${formatCurrency(program.tuition_per_credit, program.fee_currency)}/credit`
                                            ) : (
                                                "Free / Unset"
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setCloningProgram(program);
                                                        setCreateUniId(String(program.university_id));
                                                        setCreateUnitId(program.unit_id ? String(program.unit_id) : "");
                                                        fetchUnits(program.university_id);
                                                        setCreateSuccess(null);
                                                        setIsCreateOpen(true);
                                                    }}
                                                    title={`Duplicate ${program.name_en}`}
                                                >
                                                    <Copy className="size-3.5" />
                                                    Duplicate
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => setEditingProgram(program)}>
                                                    <Pencil className="size-3.5" />
                                                    Edit
                                                </Button>
                                                <ConfirmButton label="Delete" confirmLabel="Delete program?" onConfirm={() => handleDelete(program.id)} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create Program Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => {
                    setIsCreateOpen(false);
                    setCloningProgram(null);
                    setCreateSuccess(null);
                    setCreateUniId("");
                    setCreateUnitId("");
                }}
                title={cloningProgram ? `Duplicate “${cloningProgram.name_en}”` : "New Academic Program"}
                icon={<GraduationCap className="size-5 text-primary" />}
            >
                <form onSubmit={handleCreate} className="space-y-4">
                    {createSuccess ? <Alert variant="success">{createSuccess}</Alert> : null}

                    <Field label="University" htmlFor="create-uni" required>
                        <Select
                            id="create-uni"
                            name="university_id"
                            required
                            value={createUniId}
                            onChange={(e) => {
                                const val = e.target.value;
                                setCreateUniId(val);
                                setCreateUnitId("");
                                if (val) fetchUnits(val);
                            }}
                        >
                            <option value="">Select University…</option>
                            {universities.map((u) => (
                                <option key={u.id} value={String(u.id)}>{u.name_en}</option>
                            ))}
                        </Select>
                    </Field>

                    {createUniId ? (
                        <Field label="Belongs to Unit / Faculty" htmlFor="create-unit">
                            <Select
                                id="create-unit"
                                name="unit_id"
                                value={createUnitId}
                                onChange={(e) => setCreateUnitId(e.target.value)}
                                disabled={loadingUnits}
                            >
                                <option value="">No unit (University-Wide / Standalone)</option>
                                {createUnits.map((u) => {
                                    const parent = u.parent_id ? createUnits.find((p) => p.id === u.parent_id) : null;
                                    const label = parent ? `${parent.name_en} → ${u.name_en}` : u.name_en;
                                    return (
                                        <option key={u.id} value={String(u.id)}>
                                            {label} ({u.kind})
                                        </option>
                                    );
                                })}
                            </Select>
                        </Field>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Program Name (EN)" htmlFor="create-name-en" required>
                            <Input
                                id="create-name-en"
                                name="name_en"
                                required
                                placeholder="Computer Science"
                                defaultValue={cloningProgram ? `${cloningProgram.name_en} (Copy)` : ""}
                            />
                        </Field>
                        <Field label="Program Name (KH)" htmlFor="create-name-kh">
                            <Input
                                id="create-name-kh"
                                name="name_kh"
                                placeholder="វិទ្យាសាស្ត្រកុំព្យូទ័រ"
                                defaultValue={cloningProgram?.name_kh ? `${cloningProgram.name_kh} (ចម្លង)` : ""}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {!createUnitId ? (
                            <Field label="Faculty" htmlFor="create-faculty">
                                <Input
                                    id="create-faculty"
                                    name="faculty"
                                    placeholder="Faculty of Science"
                                    defaultValue={cloningProgram?.faculty ?? ""}
                                />
                            </Field>
                        ) : (
                            <Field label="Faculty (Inferred from unit)">
                                <Input
                                    disabled
                                    value={(() => {
                                        const selected = createUnits.find((u) => String(u.id) === createUnitId);
                                        if (!selected) return cloningProgram?.faculty ?? "";
                                        if (selected.parent_id) {
                                            const parent = createUnits.find((u) => u.id === selected.parent_id);
                                            return parent ? parent.name_en : selected.name_en;
                                        }
                                        return selected.name_en;
                                    })()}
                                    className="bg-muted text-muted-foreground"
                                />
                            </Field>
                        )}
                        <Field label="Degree Level" htmlFor="create-degree" required>
                            <Select id="create-degree" name="degree_level" defaultValue={cloningProgram?.degree_level ?? "BACHELOR"}>
                                {DEGREE_LEVELS.map((lvl) => (
                                    <option key={lvl} value={lvl}>{lvl}</option>
                                ))}
                            </Select>
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Duration (years)" htmlFor="create-duration" required>
                            <Input
                                id="create-duration"
                                name="duration_years"
                                type="number"
                                step="0.5"
                                defaultValue={cloningProgram?.duration_years ?? 4}
                                required
                            />
                        </Field>
                        <Field label="Currency" htmlFor="create-currency">
                            <Select id="create-currency" name="fee_currency" defaultValue={cloningProgram?.fee_currency ?? "USD"}>
                                {CURRENCIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </Select>
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Language Track" htmlFor="create-lang">
                            <Input
                                id="create-lang"
                                name="language_track"
                                placeholder="e.g. Khmer, English, Bilingual"
                                defaultValue={cloningProgram?.language_track ?? ""}
                            />
                        </Field>
                        <Field label="CQF Level" htmlFor="create-cqf">
                            <Input
                                id="create-cqf"
                                name="cqf_level"
                                placeholder="e.g. Level 6 (Bachelor)"
                                defaultValue={cloningProgram?.cqf_level ?? ""}
                            />
                        </Field>
                        <Field label="Field of Study" htmlFor="create-field">
                            <Input
                                id="create-field"
                                name="field_of_study"
                                placeholder="e.g. STEM, Business"
                                defaultValue={cloningProgram?.field_of_study ?? ""}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Tuition / Year (Standard)" htmlFor="create-tuition">
                            <Input
                                id="create-tuition"
                                name="tuition_per_year"
                                type="number"
                                placeholder="1000"
                                defaultValue={cloningProgram?.tuition_per_year ?? ""}
                            />
                        </Field>
                        <Field label="Tuition / Year (Female Discount)" htmlFor="create-tuition-female">
                            <Input
                                id="create-tuition-female"
                                name="tuition_female_per_year"
                                type="number"
                                placeholder="e.g. 500"
                                defaultValue={cloningProgram?.tuition_female_per_year ?? ""}
                            />
                        </Field>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">Study Shifts (វេនសិក្សា)</label>
                        <div className="grid grid-cols-2 gap-2">
                            {STUDY_SHIFTS.map((shift) => {
                                const info = STUDY_SHIFT_LABELS[shift];
                                const isChecked = cloningProgram?.shifts?.includes(shift);
                                return (
                                    <label key={shift} className="flex items-start gap-2 rounded-lg border p-2 text-xs hover:bg-muted/40 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="shifts"
                                            value={shift}
                                            defaultChecked={isChecked}
                                            className="mt-0.5 rounded border-input text-primary focus:ring-primary"
                                        />
                                        <div>
                                            <div className="font-medium">{info.kh} ({info.en})</div>
                                            <div className="text-2xs text-muted-foreground">{info.time}</div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsCreateOpen(false);
                                setCloningProgram(null);
                                setCreateSuccess(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" variant="outline" value="another">
                            Save & Add Another
                        </Button>
                        <Button type="submit" value="save">
                            Create Program
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Program Modal */}
            <Modal isOpen={Boolean(editingProgram)} onClose={() => setEditingProgram(null)} title="Edit Academic Program" icon={<Pencil className="size-5 text-primary" />}>
                {editingProgram ? (
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Program Name (EN)" htmlFor="edit-name-en" required>
                                <Input id="edit-name-en" name="name_en" defaultValue={editingProgram.name_en} required />
                            </Field>
                            <Field label="Program Name (KH)" htmlFor="edit-name-kh">
                                <Input id="edit-name-kh" name="name_kh" defaultValue={editingProgram.name_kh ?? ""} />
                            </Field>
                        </div>

                        {editUnits.length > 0 ? (
                            <Field label="Belongs to Unit / Faculty" htmlFor="edit-unit">
                                <Select
                                    id="edit-unit"
                                    name="unit_id"
                                    value={editUnitId}
                                    onChange={(e) => setEditUnitId(e.target.value)}
                                    disabled={loadingUnits}
                                >
                                    <option value="">No unit (University-Wide / Standalone)</option>
                                    {editUnits.map((u) => {
                                        const parent = u.parent_id ? editUnits.find((p) => p.id === u.parent_id) : null;
                                        const label = parent ? `${parent.name_en} → ${u.name_en}` : u.name_en;
                                        return (
                                            <option key={u.id} value={String(u.id)}>
                                                {label} ({u.kind})
                                            </option>
                                        );
                                    })}
                                </Select>
                            </Field>
                        ) : null}

                        <div className="grid gap-4 sm:grid-cols-2">
                            {!editUnitId ? (
                                <Field label="Faculty" htmlFor="edit-faculty">
                                    <Input id="edit-faculty" name="faculty" defaultValue={editingProgram.faculty ?? ""} />
                                </Field>
                            ) : (
                                <Field label="Faculty (Inferred from unit)">
                                    <Input
                                        disabled
                                        value={(() => {
                                            const selected = editUnits.find((u) => String(u.id) === editUnitId);
                                            if (!selected) return editingProgram.faculty ?? "";
                                            if (selected.parent_id) {
                                                const parent = editUnits.find((u) => u.id === selected.parent_id);
                                                return parent ? parent.name_en : selected.name_en;
                                            }
                                            return selected.name_en;
                                        })()}
                                        className="bg-muted text-muted-foreground"
                                    />
                                </Field>
                            )}
                            <Field label="Degree Level" htmlFor="edit-degree" required>
                                <Select id="edit-degree" name="degree_level" defaultValue={editingProgram.degree_level}>
                                    {DEGREE_LEVELS.map((lvl) => (
                                        <option key={lvl} value={lvl}>{lvl}</option>
                                    ))}
                                </Select>
                            </Field>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Duration (years)" htmlFor="edit-duration" required>
                                <Input id="edit-duration" name="duration_years" type="number" step="0.5" defaultValue={editingProgram.duration_years ?? 4} required />
                            </Field>
                            <Field label="Currency" htmlFor="edit-currency">
                                <Select id="edit-currency" name="fee_currency" defaultValue={editingProgram.fee_currency}>
                                    {CURRENCIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </Select>
                            </Field>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field label="Language Track" htmlFor="edit-lang">
                                <Input
                                    id="edit-lang"
                                    name="language_track"
                                    placeholder="e.g. Khmer, English, Bilingual"
                                    defaultValue={editingProgram.language_track ?? ""}
                                />
                            </Field>
                            <Field label="CQF Level" htmlFor="edit-cqf">
                                <Input
                                    id="edit-cqf"
                                    name="cqf_level"
                                    placeholder="e.g. Level 6 (Bachelor)"
                                    defaultValue={editingProgram.cqf_level ?? ""}
                                />
                            </Field>
                            <Field label="Field of Study" htmlFor="edit-field">
                                <Input
                                    id="edit-field"
                                    name="field_of_study"
                                    placeholder="e.g. STEM, Business"
                                    defaultValue={editingProgram.field_of_study ?? ""}
                                />
                            </Field>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Tuition / Year (Standard)" htmlFor="edit-tuition">
                                <Input id="edit-tuition" name="tuition_per_year" type="number" defaultValue={editingProgram.tuition_per_year ?? ""} />
                            </Field>
                            <Field label="Tuition / Year (Female Discount)" htmlFor="edit-tuition-female">
                                <Input id="edit-tuition-female" name="tuition_female_per_year" type="number" defaultValue={editingProgram.tuition_female_per_year ?? ""} />
                            </Field>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground">Study Shifts (វេនសិក្សា)</label>
                            <div className="grid grid-cols-2 gap-2">
                                {STUDY_SHIFTS.map((shift) => {
                                    const info = STUDY_SHIFT_LABELS[shift];
                                    const isChecked = editingProgram.shifts?.includes(shift);
                                    return (
                                        <label key={shift} className="flex items-start gap-2 rounded-lg border p-2 text-xs hover:bg-muted/40 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="shifts"
                                                value={shift}
                                                defaultChecked={isChecked}
                                                className="mt-0.5 rounded border-input text-primary focus:ring-primary"
                                            />
                                            <div>
                                                <div className="font-medium">{info.kh} ({info.en})</div>
                                                <div className="text-2xs text-muted-foreground">{info.time}</div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setEditingProgram(null)}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </div>
                    </form>
                ) : null}
            </Modal>

            {/* Batch Program Modal */}
            <BatchProgramModal
                isOpen={isBatchOpen}
                onClose={() => setIsBatchOpen(false)}
                universities={universities}
                universityId={uniFilter || undefined}
                units={uniFilter ? unitsCache[uniFilter] : undefined}
                onSuccess={newPrograms => {
                    setIsBatchOpen(false);
                    startTransition(() => router.refresh());
                }}
            />
        </div>
    );
}
