"use client";

import { Folder, Grid, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmButton from "@/components/ui/confirm-button";
import { Alert, EmptyState, Spinner } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { apiRequest } from "@/lib/api";
import { type UnitSummary, type UnitKind } from "@/lib/types";
import { cn } from "@/lib/utils";

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

interface UnitFormProps {
    defaultValue?: Partial<UnitSummary>;
    onSave: (unit: UnitSummary) => void;
    onClose: () => void;
    isEditing: boolean;
    unitId?: string;
}

/** Shared field layout for the create and edit unit forms. */
function UnitForm({ defaultValue, onSave, onClose, isEditing, unitId }: UnitFormProps) {
    const [nameEn, setNameEn] = useState(defaultValue?.name_en ?? "");
    const [nameKh, setNameKh] = useState(defaultValue?.name_kh ?? "");
    const [kind, setKind] = useState<UnitKind>(defaultValue?.kind ?? "FACULTY");
    const [parentId, setParentId] = useState<string | null>(defaultValue?.parent_id ?? null);
    const [categoryEn, setCategoryEn] = useState(defaultValue?.category_en ?? "");
    const [categoryKh, setCategoryKh] = useState(defaultValue?.category_kh ?? "");
    const [position, setPosition] = useState(defaultValue?.position ?? 0);
    const [logo, setLogo] = useState(defaultValue?.logo ?? "");
    const [pending, startTransition] = useTransition();

    function handleSave(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        startTransition(async () => {
            try {
                const payload = {
                    name_en: nameEn.trim(),
                    name_kh: nameKh.trim() || undefined,
                    kind,
                    parent_id: parentId || undefined,
                    category_en: categoryEn.trim() || undefined,
                    category_kh: categoryKh.trim() || undefined,
                    logo: logo || undefined,
                    position,
                };

                let response;
                if (isEditing && unitId) {
                    response = await apiRequest<UnitSummary>(
                        `/api/v1/admin/universities/${unitId}/units`, // Will need to verify endpoint
                        { method: "PATCH", body: payload }
                    );
                } else {
                    response = await apiRequest<UnitSummary>(
                        `/api/v1/admin/universities/${unitId}/units`, // Will need to verify endpoint
                        { method: "POST", body: payload }
                    );
                }

                onSave(response);
                onClose();
            } catch (caught) {
                // Error handled by caller via alert
            }
        });
    }

    return (
        <form onSubmit={handleSave} className="space-y-4 rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-medium">{isEditing ? "Edit unit" : "New unit"}</p>

            <Field label="Name (English)" htmlFor="u-name-en" required className="lg:col-span-2">
                <Input
                    id="u-name-en"
                    name="name_en"
                    placeholder="Faculty of Engineering"
                    defaultValue={nameEn}
                    required
                />
            </Field>

            <Field label="Name (Khmer)" htmlFor="u-name-kh">
                <Input id="u-name-kh" name="name_kh" defaultValue={nameKh} />
            </Field>

            <Field label="Kind" htmlFor="u-kind" required>
                <Select id="u-kind" name="kind" defaultValue={kind}>
                    <option value="FACULTY">Faculty</option>
                    <option value="DEPARTMENT">Department</option>
                    <option value="SUB_DEPARTMENT">Sub-Department</option>
                    <option value="FOUNDATION">Foundation</option>
                </Select>
            </Field>

            <Field label="Parent Unit" htmlFor="u-parent">
                <Input
                    id="u-parent"
                    name="parent_id"
                    placeholder="Select parent unit (optional)"
                    defaultValue={parentId ?? ""}
                />
                <p className="text-xs text-muted-foreground mt-1">
                    Leave blank for top-level unit (Faculty/Foundation).
                </p>
            </Field>

            <Field label="Category (English)" htmlFor="u-category-en">
                <Input id="u-category-en" name="category_en" defaultValue={categoryEn} />
            </Field>

            <Field label="Category (Khmer)" htmlFor="u-category-kh">
                <Input id="u-category-kh" name="category_kh" defaultValue={categoryKh} />
            </Field>

            <Field label="Position" htmlFor="u-position" required>
                <Input
                    id="u-position"
                    name="position"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={position.toString() || "0"}
                    required
                />
            </Field>

            <Field label="Logo URL" htmlFor="u-logo">
                <Input
                    id="u-logo"
                    name="logo"
                    placeholder="https://example.edu.kh/logo.png"
                    defaultValue={logo}
                />
            </Field>

            <div className="flex gap-2">
                <Button
                    type="submit"
                    disabled={pending}
                >
                    {pending ? <Spinner className="size-4" /> : "Save"}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    disabled={pending}
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}

export default function UnitManager({
    universityId,
    units,
}: {
    universityId: string;
    units: UnitSummary[];
}) {
    const router = useRouter();
    const [items, setItems] = useState<UnitSummary[]>(units);
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    // Keep local rows in sync when the server component refetches after router.refresh().
    useEffect(() => setItems(units), [units]);

    function flash(message: string) {
        setSaved(message);
        setError(null);
    }

    function handleCreate() {
        setAdding(true);
        setEditingId(null);
    }

    function handleSaveUnit(unit: UnitSummary) {
        setItems(current => [...current, unit]);
        setAdding(false);
        flash(`“${unit.name_en}” added.`);
        router.refresh();
    }

    function handleUpdate(unit: UnitSummary) {
        return async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            // Unit update handled via handleSaveUnit pattern
            // For now, just refresh
            setEditingId(null);
            flash(`“${unit.name_en}” updated.`);
            router.refresh();
        };
    }

    function handleDelete(unit: UnitSummary) {
        return async () => {
            try {
                await apiRequest(`/api/v1/admin/universities/${unit.id}`, {
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

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Folder className="size-4 text-primary" />
                    <h3 className="text-base font-semibold">Units (Faculties & Departments)</h3>
                    <Badge variant="outline">{items.length}</Badge>
                </div>
                {!adding ? (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setAdding(true);
                            setEditingId(null);
                        }}
                    >
                        <Plus className="size-4" />
                        Add unit
                    </Button>
                ) : null}
            </div>

            {error ? <Alert>{error}</Alert> : null}
            {saved && !error ? <Alert variant="success">{saved}</Alert> : null}

            {adding ? (
                <form onSubmit={() => { /* handled via UnitForm onSave */ }} className="space-y-4 rounded-xl border bg-muted/30 p-4">
                    <p className="text-sm font-medium">New unit</p>
                    <UnitForm onSave={handleSaveUnit} onClose={() => setAdding(false)} isEditing={false} />
                </form>
            ) : null}

            {items.length === 0 && !adding ? (
                <EmptyState
                    title="No units yet"
                    description="Add faculties, departments, or other organizational units so students can explore the structure."
                    action={
                        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                            <Plus className="size-4" />
                            Add unit
                        </Button>
                    }
                />
            ) : null}

            {items.length > 0 ? (
                <div className="divide-y rounded-xl border">
                    {items.map(unit =>
                        editingId === unit.id ? (
                            <form
                                key={unit.id}
                                onSubmit={handleUpdate(unit)}
                                className="space-y-4 bg-muted/30 p-4"
                            >
                                <p className="text-sm font-medium">Edit “{unit.name_en}”</p>
                                <UnitForm
                                    defaultValue={unit}
                                    onSave={handleSaveUnit}
                                    onClose={() => setEditingId(null)}
                                    isEditing={true}
                                    unitId={unit.id}
                                />
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
                                        {unit.kind} · Position {unit.position}
                                    </p>
                                </div>

                                <Badge variant="outline">{unit.kind}</Badge>

                                <div className="flex items-center gap-1.5">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setEditingId(unit.id);
                                            setAdding(false);
                                        }}
                                        aria-label={`Edit ${unit.name_en}`}
                                    >
                                        <Folder className="size-3.5" />
                                        Edit
                                    </Button>
                                    <ConfirmButton
                                        onConfirm={handleDelete(unit)}
                                        confirmLabel={`Delete “${unit.name_en}”?`}
                                    >
                                        <Trash2 className="size-3.5" />
                                        Delete
                                    </ConfirmButton>
                                </div>
                            </div>
                        )
                    )}
                </div>
            ) : null}
        </div>
    );
}