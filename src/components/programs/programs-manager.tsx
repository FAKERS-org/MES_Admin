"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Pencil, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ConfirmButton from "@/components/ui/confirm-button";
import { Alert, EmptyState, PageHeader } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api";
import {
    CURRENCIES,
    DEGREE_LEVELS,
    type Currency,
    type DegreeLevel,
    type ProgramCreatePayload,
    type ProgramListItem,
    type ProgramUpdatePayload,
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
    const [uniFilter, setUniFilter] = useState("");

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingProgram, setEditingProgram] = useState<ProgramListItem | null>(null);
    const [error, setError] = useState<string | null>(null);

    const filtered = initialPrograms.filter((p) => {
        if (degreeFilter && p.degree_level !== degreeFilter) return false;
        if (uniFilter && String(p.university_id) !== uniFilter) return false;
        if (search) {
            const term = search.toLowerCase();
            const text = `${p.name_en} ${p.name_kh ?? ""} ${p.faculty ?? ""} ${p.university_name ?? ""}`.toLowerCase();
            if (!text.includes(term)) return false;
        }
        return true;
    });

    const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const form = new FormData(e.currentTarget);
        const universityId = raw(form, "university_id");

        if (!universityId) {
            setError("Please select a university.");
            return;
        }

        const payload: ProgramCreatePayload = {
            name_en: raw(form, "name_en"),
            name_kh: nullable(form, "name_kh"),
            faculty: nullable(form, "faculty"),
            degree_level: raw(form, "degree_level") as DegreeLevel,
            duration_years: Number(raw(form, "duration_years")) || 4,
            tuition_per_year: numberOrNull(form, "tuition_per_year"),
            tuition_per_credit: numberOrNull(form, "tuition_per_credit"),
            fee_currency: (raw(form, "fee_currency") as Currency) || "USD",
        };

        try {
            await apiRequest(`/api/admin/universities/${universityId}/programs`, {
                method: "POST",
                body: payload,
            });
            setIsCreateOpen(false);
            startTransition(() => router.refresh());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create program");
        }
    };

    const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingProgram) return;
        setError(null);
        const form = new FormData(e.currentTarget);

        const payload: ProgramUpdatePayload = {
            name_en: raw(form, "name_en"),
            name_kh: nullable(form, "name_kh"),
            faculty: nullable(form, "faculty"),
            degree_level: raw(form, "degree_level") as DegreeLevel,
            duration_years: Number(raw(form, "duration_years")) || 4,
            tuition_per_year: numberOrNull(form, "tuition_per_year"),
            tuition_per_credit: numberOrNull(form, "tuition_per_credit"),
            fee_currency: (raw(form, "fee_currency") as Currency) || "USD",
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
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="size-4" />
                        New program
                    </Button>
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

                {(search || degreeFilter || uniFilter) ? (
                    <Button variant="ghost" onClick={() => { setSearch(""); setDegreeFilter(""); setUniFilter(""); }}>
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
                                            {program.faculty ? (
                                                <div className="text-xs text-muted-foreground/80 mt-0.5">Faculty: {program.faculty}</div>
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
                                            {program.tuition_per_year
                                                ? `${formatCurrency(program.tuition_per_year, program.fee_currency)}/yr`
                                                : program.tuition_per_credit
                                                ? `${formatCurrency(program.tuition_per_credit, program.fee_currency)}/credit`
                                                : "Free / Unset"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
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
            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Academic Program" icon={<GraduationCap className="size-5 text-primary" />}>
                <form onSubmit={handleCreate} className="space-y-4">
                    <Field label="University" htmlFor="create-uni" required>
                        <Select id="create-uni" name="university_id" required>
                            <option value="">Select University…</option>
                            {universities.map((u) => (
                                <option key={u.id} value={String(u.id)}>{u.name_en}</option>
                            ))}
                        </Select>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Program Name (EN)" htmlFor="create-name-en" required>
                            <Input id="create-name-en" name="name_en" required placeholder="Computer Science" />
                        </Field>
                        <Field label="Program Name (KH)" htmlFor="create-name-kh">
                            <Input id="create-name-kh" name="name_kh" placeholder="វិទ្យាសាស្ត្រកុំព្យូទ័រ" />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Faculty" htmlFor="create-faculty">
                            <Input id="create-faculty" name="faculty" placeholder="Faculty of Science" />
                        </Field>
                        <Field label="Degree Level" htmlFor="create-degree" required>
                            <Select id="create-degree" name="degree_level" defaultValue="BACHELOR">
                                {DEGREE_LEVELS.map((lvl) => (
                                    <option key={lvl} value={lvl}>{lvl}</option>
                                ))}
                            </Select>
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Duration (years)" htmlFor="create-duration" required>
                            <Input id="create-duration" name="duration_years" type="number" step="0.5" defaultValue="4" required />
                        </Field>
                        <Field label="Tuition / Year" htmlFor="create-tuition">
                            <Input id="create-tuition" name="tuition_per_year" type="number" placeholder="1000" />
                        </Field>
                        <Field label="Currency" htmlFor="create-currency">
                            <Select id="create-currency" name="fee_currency" defaultValue="USD">
                                {CURRENCIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </Select>
                        </Field>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button type="submit">Create Program</Button>
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

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Faculty" htmlFor="edit-faculty">
                                <Input id="edit-faculty" name="faculty" defaultValue={editingProgram.faculty ?? ""} />
                            </Field>
                            <Field label="Degree Level" htmlFor="edit-degree" required>
                                <Select id="edit-degree" name="degree_level" defaultValue={editingProgram.degree_level}>
                                    {DEGREE_LEVELS.map((lvl) => (
                                        <option key={lvl} value={lvl}>{lvl}</option>
                                    ))}
                                </Select>
                            </Field>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field label="Duration (years)" htmlFor="edit-duration" required>
                                <Input id="edit-duration" name="duration_years" type="number" step="0.5" defaultValue={editingProgram.duration_years ?? 4} required />
                            </Field>
                            <Field label="Tuition / Year" htmlFor="edit-tuition">
                                <Input id="edit-tuition" name="tuition_per_year" type="number" defaultValue={editingProgram.tuition_per_year ?? ""} />
                            </Field>
                            <Field label="Currency" htmlFor="edit-currency">
                                <Select id="edit-currency" name="fee_currency" defaultValue={editingProgram.fee_currency}>
                                    {CURRENCIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </Select>
                            </Field>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setEditingProgram(null)}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </div>
                    </form>
                ) : null}
            </Modal>
        </div>
    );
}
