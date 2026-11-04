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
import ProgramFields, { programPayload, raw } from "@/components/programs/program-fields";
import { apiRequest } from "@/lib/api";
import {
    DEGREE_LEVELS,
    STUDY_SHIFTS,
    STUDY_SHIFT_LABELS,
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
        if (editingProgram?.university_id) {
            fetchUnits(editingProgram.university_id);
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

        const payload = programPayload(form, createUnits);
        if (!payload.name_en) {
            setError("Program name (English) is required.");
            return;
        }

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
        const payload: ProgramUpdatePayload = programPayload(form, editUnits);
        if (!payload.name_en) {
            setError("Program name (English) is required.");
            return;
        }

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
                        <ProgramFields
                            defaultValue={
                                cloningProgram
                                    ? {
                                          ...cloningProgram,
                                          name_en: `${cloningProgram.name_en} (Copy)`,
                                          name_kh: cloningProgram.name_kh ? `${cloningProgram.name_kh} (ចម្លង)` : "",
                                      }
                                    : undefined
                            }
                            units={createUnits}
                        />
                    ) : null}

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
                        <ProgramFields defaultValue={editingProgram} units={editUnits} />

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
