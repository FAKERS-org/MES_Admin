"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmButton from "@/components/ui/confirm-button";
import { Alert, EmptyState, Spinner } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/field";
import { apiRequest } from "@/lib/api";

export interface ContentRow {
    id: string;
}

/** Declarative description of one editable column of a content row. */
export interface FieldSpec {
    name: string;
    label: string;
    kind?: "text" | "number" | "textarea" | "json";
    required?: boolean;
    placeholder?: string;
    hint?: ReactNode;
}

export interface ContentManagerProps<T extends ContentRow> {
    unitId: string;
    /** Upstream collection segment, e.g. "facilities". */
    collection: string;
    title: string;
    icon: ReactNode;
    items: T[];
    fields: FieldSpec[];
    /** Singular noun used in flash messages, e.g. "facility". */
    noun: string;
    emptyTitle: string;
    emptyDescription: string;
    rowTitle: (item: T) => string;
    rowMeta?: (item: T) => ReactNode;
    /** Extra note under the header, e.g. inherited-content counts. */
    notice?: ReactNode;
}

/**
 * CRUD shell shared by a unit's three content collections (facilities,
 * scholarships, curriculum sections). Rows are edited through the
 * `/api/admin/units/{unitId}/{collection}` proxy routes, which mirror the
 * admin content API of MES_Api.
 *
 * Empty optional fields are omitted from the payload, so a PATCH never wipes
 * a stored value the form did not show.
 */
export default function ContentManager<T extends ContentRow>({
    unitId,
    collection,
    title,
    icon,
    items,
    fields,
    noun,
    emptyTitle,
    emptyDescription,
    rowTitle,
    rowMeta,
    notice,
}: ContentManagerProps<T>) {
    const router = useRouter();
    const [rows, setRows] = useState<T[]>(items);
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    useEffect(() => setRows(items), [items]);

    const basePath = `/api/admin/units/${unitId}/${collection}`;

    function flash(message: string) {
        setSaved(message);
        setError(null);
    }

    function upsert(row: T) {
        setRows(current => {
            const index = current.findIndex(item => item.id === row.id);
            if (index === -1) return [...current, row];
            const next = [...current];
            next[index] = row;
            return next;
        });
    }

    /** FormData -> JSON payload following the field specs; throws on bad input. */
    function buildPayload(form: FormData): Record<string, unknown> {
        const payload: Record<string, unknown> = {};

        for (const field of fields) {
            const value = String(form.get(field.name) ?? "").trim();

            if (field.kind === "json") {
                if (!value) {
                    if (field.required) throw new Error(`${field.label} must not be empty.`);
                    continue;
                }
                try {
                    payload[field.name] = JSON.parse(value);
                } catch {
                    throw new Error(`${field.label} must be valid JSON.`);
                }
                continue;
            }

            if (!value) {
                if (field.required) throw new Error(`${field.label} is required.`);
                continue;
            }
            payload[field.name] = field.kind === "number" ? Number(value) : value;
        }

        return payload;
    }

    function defaultValueOf(item: T, field: FieldSpec): string {
        const value = (item as unknown as Record<string, unknown>)[field.name];
        if (value === undefined || value === null) return field.kind === "number" ? "0" : "";
        return field.kind === "json" ? JSON.stringify(value, null, 2) : String(value);
    }

    function formFields(defaults?: T) {
        return fields.map(field => (
            <Field
                key={field.name}
                label={field.label}
                htmlFor={`${field.name}-${defaults ? "edit" : "new"}`}
                required={field.required}
                hint={field.hint}
            >
                {field.kind === "textarea" || field.kind === "json" ? (
                    <Textarea
                        id={`${field.name}-${defaults ? "edit" : "new"}`}
                        name={field.name}
                        placeholder={field.placeholder}
                        defaultValue={defaults ? defaultValueOf(defaults, field) : ""}
                        className="font-mono text-xs"
                        rows={field.kind === "json" ? 10 : 3}
                    />
                ) : (
                    <Input
                        id={`${field.name}-${defaults ? "edit" : "new"}`}
                        name={field.name}
                        type={field.kind === "number" ? "number" : "text"}
                        placeholder={field.placeholder}
                        defaultValue={defaults ? defaultValueOf(defaults, field) : ""}
                    />
                )}
            </Field>
        ));
    }

    function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        startTransition(async () => {
            try {
                const created = await apiRequest<T>(basePath, {
                    method: "POST",
                    body: buildPayload(new FormData(event.currentTarget)),
                });
                upsert(created);
                setAdding(false);
                flash(`“${rowTitle(created)}” added.`);
                router.refresh();
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : `Could not add the ${noun}.`);
            }
        });
    }

    function handleUpdate(item: T) {
        return (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            startTransition(async () => {
                try {
                    const updated = await apiRequest<T>(`${basePath}/${item.id}`, {
                        method: "PATCH",
                        body: buildPayload(new FormData(event.currentTarget)),
                    });
                    upsert(updated);
                    setEditingId(null);
                    flash(`“${rowTitle(updated)}” updated.`);
                    router.refresh();
                } catch (caught) {
                    setError(caught instanceof Error ? caught.message : `Could not update the ${noun}.`);
                }
            });
        };
    }

    function handleDelete(item: T) {
        return async () => {
            try {
                await apiRequest(`${basePath}/${item.id}`, { method: "DELETE" });
                setRows(current => current.filter(row => row.id !== item.id));
                flash(`“${rowTitle(item)}” deleted.`);
                router.refresh();
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : `Could not delete the ${noun}.`);
            }
        };
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {icon}
                    <h3 className="text-base font-semibold">{title}</h3>
                    <Badge variant="outline">{rows.length}</Badge>
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
                        Add
                    </Button>
                ) : null}
            </div>

            {notice ? <p className="text-xs text-muted-foreground">{notice}</p> : null}
            {error ? <Alert>{error}</Alert> : null}
            {saved && !error ? <Alert variant="success">{saved}</Alert> : null}

            {adding ? (
                <form onSubmit={handleCreate} className="space-y-4 rounded-xl border bg-muted/30 p-4">
                    <p className="text-sm font-medium">New {noun}</p>
                    <div className="grid gap-4 sm:grid-cols-2">{formFields()}</div>
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={pending}>
                            {pending ? <Spinner className="size-3.5" /> : null}
                            {pending ? "Adding…" : `Add ${noun}`}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setAdding(false)}
                            disabled={pending}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            ) : null}

            {rows.length === 0 && !adding ? (
                <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={
                        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                            <Plus className="size-4" />
                            Add
                        </Button>
                    }
                />
            ) : null}

            {rows.length > 0 ? (
                <div className="divide-y rounded-xl border">
                    {rows.map(item =>
                        editingId === item.id ? (
                            <form key={item.id} onSubmit={handleUpdate(item)} className="space-y-4 bg-muted/30 p-4">
                                <p className="text-sm font-medium">Edit “{rowTitle(item)}”</p>
                                <div className="grid gap-4 sm:grid-cols-2">{formFields(item)}</div>
                                <div className="flex gap-2">
                                    <Button type="submit" size="sm" disabled={pending}>
                                        {pending ? <Spinner className="size-3.5" /> : null}
                                        {pending ? "Saving…" : `Save ${noun}`}
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
                            <div key={item.id} className="flex flex-wrap items-center gap-3 p-3.5">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{rowTitle(item)}</p>
                                    {rowMeta ? (
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{rowMeta(item)}</p>
                                    ) : null}
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setEditingId(item.id);
                                            setAdding(false);
                                        }}
                                        aria-label={`Edit ${rowTitle(item)}`}
                                    >
                                        Edit
                                    </Button>
                                    <ConfirmButton
                                        onConfirm={handleDelete(item)}
                                        confirmLabel={`Delete “${rowTitle(item)}”?`}
                                    >
                                        <Trash2 className="size-3.5" />
                                        Delete
                                    </ConfirmButton>
                                </div>
                            </div>
                        ),
                    )}
                </div>
            ) : null}
        </div>
    );
}
