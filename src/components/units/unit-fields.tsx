"use client";

import { Field, Input, Select } from "@/components/ui/field";
import { UNIT_KINDS, type UnitCreatePayload, type UnitKind, type UnitSummary } from "@/lib/types";

export function raw(form: FormData, key: string): string {
    return String(form.get(key) ?? "").trim();
}

function nullable(form: FormData, key: string): string | null {
    return raw(form, key) || null;
}

/** FormData -> unit payload, shared by the create/edit forms. */
export function unitPayload(form: FormData): UnitCreatePayload {
    return {
        name_en: raw(form, "name_en"),
        name_kh: nullable(form, "name_kh"),
        kind: (form.get("kind") as UnitKind | null) ?? "FACULTY",
        parent_id: nullable(form, "parent_id"),
        category_en: raw(form, "category_en"),
        category_kh: nullable(form, "category_kh"),
        logo: nullable(form, "logo"),
        position: Number(raw(form, "position") || 0),
    };
}

/**
 * Uncontrolled fields for creating/editing a unit - values are read from
 * FormData on submit, like the program forms on the university page.
 *
 * `siblings` (for the parent dropdown) excludes the unit being edited so a
 * unit can never become its own parent.
 */
export default function UnitFields({
    defaultValue,
    siblings = [],
}: {
    defaultValue?: UnitSummary;
    siblings?: UnitSummary[];
}) {
    const kind = defaultValue?.kind ?? "FACULTY";
    const parentId = defaultValue?.parent_id ?? "";
    const options = siblings.filter(unit => unit.id !== defaultValue?.id);

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name (English)" htmlFor="u-name-en" required className="lg:col-span-2">
                <Input
                    id="u-name-en"
                    name="name_en"
                    placeholder="Faculty of Engineering"
                    defaultValue={defaultValue?.name_en ?? ""}
                    required
                />
            </Field>

            <Field label="Name (Khmer)" htmlFor="u-name-kh">
                <Input id="u-name-kh" name="name_kh" defaultValue={defaultValue?.name_kh ?? ""} />
            </Field>

            <Field label="Kind" htmlFor="u-kind" required>
                <Select id="u-kind" name="kind" defaultValue={kind}>
                    {UNIT_KINDS.map(option => (
                        <option key={option} value={option}>
                            {option.replace(/_/g, " ")}
                        </option>
                    ))}
                </Select>
            </Field>

            <Field label="Parent unit" htmlFor="u-parent">
                <Select id="u-parent" name="parent_id" defaultValue={parentId}>
                    <option value="">None (top level)</option>
                    {options.map(unit => (
                        <option key={unit.id} value={unit.id}>
                            {unit.name_en}
                        </option>
                    ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                    Sub-departments belong to a department, departments to a faculty.
                </p>
            </Field>

            <Field label="Category (English)" htmlFor="u-category-en">
                <Input
                    id="u-category-en"
                    name="category_en"
                    placeholder="Engineering"
                    defaultValue={defaultValue?.category_en ?? ""}
                />
            </Field>

            <Field label="Category (Khmer)" htmlFor="u-category-kh">
                <Input id="u-category-kh" name="category_kh" defaultValue={defaultValue?.category_kh ?? ""} />
            </Field>

            <Field label="Position" htmlFor="u-position" required>
                <Input
                    id="u-position"
                    name="position"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={String(defaultValue?.position ?? 0)}
                    required
                />
            </Field>

            <Field label="Logo URL" htmlFor="u-logo" className="lg:col-span-2">
                <Input
                    id="u-logo"
                    name="logo"
                    placeholder="https://example.edu.kh/logo.png"
                    defaultValue={defaultValue?.logo ?? ""}
                />
            </Field>
        </div>
    );
}
