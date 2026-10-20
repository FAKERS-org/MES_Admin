"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Award, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ConfirmButton from "@/components/ui/confirm-button";
import { Alert, EmptyState, PageHeader } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api";
import type { ScholarshipCreateDirectPayload, ScholarshipListItem, UniversitySummary } from "@/lib/types";

function raw(form: FormData, key: string): string {
    return String(form.get(key) ?? "").trim();
}

function nullable(form: FormData, key: string): string | null {
    return raw(form, key) || null;
}

export function ScholarshipsManager({
    initialScholarships,
    universities,
}: {
    initialScholarships: ScholarshipListItem[];
    universities: UniversitySummary[];
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [search, setSearch] = useState("");
    const [uniFilter, setUniFilter] = useState("");

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingScholarship, setEditingScholarship] = useState<ScholarshipListItem | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Filtered list
    const filtered = initialScholarships.filter((s) => {
        if (uniFilter && String(s.university_id) !== uniFilter) return false;
        if (search) {
            const term = search.toLowerCase();
            const text = `${s.name_en} ${s.name_kh ?? ""} ${s.coverage_en} ${s.university_name ?? ""}`.toLowerCase();
            if (!text.includes(term)) return false;
        }
        return true;
    });

    // Create Scholarship
    const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const form = new FormData(e.currentTarget);
        const uniId = raw(form, "university_id");

        if (!uniId) {
            setError("Please select a university.");
            return;
        }

        const payload: ScholarshipCreateDirectPayload = {
            university_id: Number(uniId),
            name_en: raw(form, "name_en"),
            name_kh: nullable(form, "name_kh"),
            coverage_en: raw(form, "coverage_en"),
            coverage_kh: nullable(form, "coverage_kh"),
            position: Number(raw(form, "position")) || 0,
        };

        try {
            await apiRequest("/api/admin/scholarships", {
                method: "POST",
                body: payload,
            });
            setIsCreateOpen(false);
            startTransition(() => router.refresh());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create scholarship");
        }
    };

    // Update Scholarship
    const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingScholarship) return;
        setError(null);
        const form = new FormData(e.currentTarget);

        const payload = {
            name_en: raw(form, "name_en"),
            name_kh: nullable(form, "name_kh"),
            coverage_en: raw(form, "coverage_en"),
            coverage_kh: nullable(form, "coverage_kh"),
            position: Number(raw(form, "position")) || 0,
        };

        try {
            await apiRequest(`/api/admin/scholarships/${editingScholarship.id}`, {
                method: "PATCH",
                body: payload,
            });
            setEditingScholarship(null);
            startTransition(() => router.refresh());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to update scholarship");
        }
    };

    // Delete Scholarship
    const handleDelete = async (id: string | number) => {
        setError(null);
        try {
            await apiRequest(`/api/admin/scholarships/${id}`, { method: "DELETE" });
            startTransition(() => router.refresh());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to delete scholarship");
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={<h1 className="text-2xl font-semibold tracking-tight">Scholarships</h1>}
                subtitle={`${filtered.length} of ${initialScholarships.length} scholarships match the current filters.`}
                actions={
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="size-4" />
                        New scholarship
                    </Button>
                }
            />

            {error ? (
                <Alert variant="destructive">
                    <div className="flex items-center justify-between">
                        <span>{error}</span>
                        <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                            <X className="size-3.5" />
                        </Button>
                    </div>
                </Alert>
            ) : null}

            {/* Filter Bar */}
            <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
                <div className="min-w-56 flex-1 space-y-1.5">
                    <label htmlFor="s-search" className="text-xs font-medium text-muted-foreground">
                        Search
                    </label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="s-search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Scholarship name, coverage, or university…"
                            className="pl-8"
                        />
                    </div>
                </div>

                <div className="w-56 space-y-1.5">
                    <label htmlFor="s-uni" className="text-xs font-medium text-muted-foreground">
                        University
                    </label>
                    <Select id="s-uni" value={uniFilter} onChange={(e) => setUniFilter(e.target.value)}>
                        <option value="">All universities</option>
                        {universities.map((u) => (
                            <option key={u.id} value={String(u.id)}>
                                {u.name_en}
                            </option>
                        ))}
                    </Select>
                </div>

                {(search || uniFilter) ? (
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setSearch("");
                            setUniFilter("");
                        }}
                    >
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
                                title="No scholarships found"
                                description="Try adjusting your filters or create a new scholarship."
                                action={
                                    <Button onClick={() => setIsCreateOpen(true)} variant="outline" size="sm">
                                        <Plus className="size-4" />
                                        New scholarship
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Scholarship</TableHead>
                                    <TableHead>Institution / Unit</TableHead>
                                    <TableHead>Coverage</TableHead>
                                    <TableHead>Position</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell>
                                            <div className="font-medium">{s.name_en}</div>
                                            {s.name_kh ? (
                                                <div className="text-xs text-muted-foreground">{s.name_kh}</div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell>
                                            {s.university_id ? (
                                                <Link
                                                    href={`/universities/${s.university_id}`}
                                                    className="font-medium text-primary hover:underline"
                                                >
                                                    {s.university_name ?? `University #${s.university_id}`}
                                                </Link>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                            {s.unit_name ? (
                                                <div className="text-xs text-muted-foreground">Unit: {s.unit_name}</div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium">{s.coverage_en}</span>
                                            {s.coverage_kh ? (
                                                <div className="text-xs text-muted-foreground">{s.coverage_kh}</div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{s.position}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setEditingScholarship(s)}
                                                >
                                                    <Pencil className="size-3.5" />
                                                    Edit
                                                </Button>
                                                <ConfirmButton
                                                    label="Delete"
                                                    confirmLabel="Delete scholarship?"
                                                    onConfirm={() => handleDelete(s.id)}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create Modal */}
            {isCreateOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl animate-in fade-in-50">
                        <div className="flex items-center justify-between pb-4 border-b">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Award className="size-5 text-primary" />
                                New Scholarship
                            </h2>
                            <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
                                <X className="size-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4 pt-4">
                            <Field label="University" htmlFor="s-create-uni" required>
                                <Select id="s-create-uni" name="university_id" required>
                                    <option value="">Select University…</option>
                                    {universities.map((u) => (
                                        <option key={u.id} value={String(u.id)}>
                                            {u.name_en}
                                        </option>
                                    ))}
                                </Select>
                            </Field>

                            <Field label="Scholarship Name (EN)" htmlFor="s-create-name-en" required>
                                <Input id="s-create-name-en" name="name_en" required placeholder="Academic Excellence Scholarship" />
                            </Field>

                            <Field label="Scholarship Name (KH)" htmlFor="s-create-name-kh">
                                <Input id="s-create-name-kh" name="name_kh" placeholder="អាហារូបករណ៍និស្សិតពូកែ" />
                            </Field>

                            <Field label="Coverage (EN)" htmlFor="s-create-coverage-en" required>
                                <Input id="s-create-coverage-en" name="coverage_en" required placeholder="100% tuition for 4 years" />
                            </Field>

                            <Field label="Coverage (KH)" htmlFor="s-create-coverage-kh">
                                <Input id="s-create-coverage-kh" name="coverage_kh" placeholder="ថ្លៃសិក្សា ១០០% រយៈពេល ៤ ឆ្នាំ" />
                            </Field>

                            <Field label="Position (order)" htmlFor="s-create-pos">
                                <Input id="s-create-pos" name="position" type="number" defaultValue="0" />
                            </Field>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    Create Scholarship
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {/* Edit Modal */}
            {editingScholarship ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl animate-in fade-in-50">
                        <div className="flex items-center justify-between pb-4 border-b">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Pencil className="size-5 text-primary" />
                                Edit Scholarship
                            </h2>
                            <Button variant="ghost" size="sm" onClick={() => setEditingScholarship(null)}>
                                <X className="size-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                            <Field label="Scholarship Name (EN)" htmlFor="s-edit-name-en" required>
                                <Input
                                    id="s-edit-name-en"
                                    name="name_en"
                                    defaultValue={editingScholarship.name_en}
                                    required
                                />
                            </Field>

                            <Field label="Scholarship Name (KH)" htmlFor="s-edit-name-kh">
                                <Input
                                    id="s-edit-name-kh"
                                    name="name_kh"
                                    defaultValue={editingScholarship.name_kh ?? ""}
                                />
                            </Field>

                            <Field label="Coverage (EN)" htmlFor="s-edit-coverage-en" required>
                                <Input
                                    id="s-edit-coverage-en"
                                    name="coverage_en"
                                    defaultValue={editingScholarship.coverage_en}
                                    required
                                />
                            </Field>

                            <Field label="Coverage (KH)" htmlFor="s-edit-coverage-kh">
                                <Input
                                    id="s-edit-coverage-kh"
                                    name="coverage_kh"
                                    defaultValue={editingScholarship.coverage_kh ?? ""}
                                />
                            </Field>

                            <Field label="Position (order)" htmlFor="s-edit-pos">
                                <Input
                                    id="s-edit-pos"
                                    name="position"
                                    type="number"
                                    defaultValue={editingScholarship.position}
                                />
                            </Field>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setEditingScholarship(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
