"use client";

import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { UNIT_KINDS, type UnitCreatePayload, type UnitKind, type UnitSummary } from "@/lib/types";

export function raw(form: FormData, key: string): string {
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

/** FormData -> unit payload, shared by the create/edit forms. */
export function unitPayload(form: FormData): UnitCreatePayload {
    return {
        name_en: raw(form, "name_en"),
        name_kh: nullable(form, "name_kh"),
        acronym: nullable(form, "acronym"),
        is_autonomous: form.get("is_autonomous") === "true" || form.get("is_autonomous") === "on",
        kind: (form.get("kind") as UnitKind | null) ?? "FACULTY",
        parent_id: nullable(form, "parent_id"),
        category_en: raw(form, "category_en"),
        category_kh: nullable(form, "category_kh"),
        logo: nullable(form, "logo"),
        position: numberOrNull(form, "position") ?? 0,
        default_tuition_per_year: numberOrNull(form, "default_tuition_per_year"),
        default_tuition_female_per_year: numberOrNull(form, "default_tuition_female_per_year"),
    };
}

export const UNIT_KIND_LABELS: Record<UnitKind, string> = {
    FACULTY: "Faculty (មហាវិទ្យាល័យ)",
    INSTITUTE: "Institute (វិទ្យាស្ថាន)",
    SCHOOL: "School (សាលា)",
    COLLEGE: "College (ខូឡេក / មហាវិទ្យាល័យ)",
    DEPARTMENT: "Department (ដេប៉ាតឺម៉ង់)",
    SUB_DEPARTMENT: "Sub-Department / Lab (ដេប៉ាតឺម៉ង់រង / មន្ទីរពិសោធន៍)",
    CENTER: "Center (មជ្ឈមណ្ឌល)",
    ACADEMY: "Academy (បណ្ឌិត្យសភា)",
    DIVISION: "Division (ផ្នែក)",
    FOUNDATION: "Foundation Year / Tronc Commun (ថ្នាក់ឆ្នាំសិក្សាមូលដ្ឋាន)",
    OTHER: "Other (ផ្សេងៗ)",
};

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
    isFieldDirty,
}: {
    defaultValue?: UnitSummary;
    siblings?: UnitSummary[];
    isFieldDirty?: (name: string) => boolean;
}) {
    const kind = defaultValue?.kind ?? "FACULTY";
    const parentId = defaultValue?.parent_id ?? "";
    const options = siblings.filter(unit => unit.id !== defaultValue?.id);

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
                label="Name (English)"
                htmlFor="u-name-en"
                required
                className="lg:col-span-2"
                dirty={isFieldDirty?.("name_en")}
            >
                <Input
                    id="u-name-en"
                    name="name_en"
                    placeholder="Faculty of Engineering"
                    defaultValue={defaultValue?.name_en ?? ""}
                    required
                    dirty={isFieldDirty?.("name_en")}
                />
            </Field>

            <Field label="Name (Khmer)" htmlFor="u-name-kh" dirty={isFieldDirty?.("name_kh")}>
                <Input
                    id="u-name-kh"
                    name="name_kh"
                    defaultValue={defaultValue?.name_kh ?? ""}
                    dirty={isFieldDirty?.("name_kh")}
                />
            </Field>

            <Field label="Acronym / Short Code" htmlFor="u-acronym" dirty={isFieldDirty?.("acronym")}>
                <Input
                    id="u-acronym"
                    name="acronym"
                    placeholder="e.g. IFL, FE, FTS"
                    defaultValue={defaultValue?.acronym ?? ""}
                    dirty={isFieldDirty?.("acronym")}
                />
            </Field>

            <Field label="Kind" htmlFor="u-kind" required dirty={isFieldDirty?.("kind")}>
                <Select
                    id="u-kind"
                    name="kind"
                    defaultValue={kind}
                    dirty={isFieldDirty?.("kind")}
                >
                    {UNIT_KINDS.map(option => (
                        <option key={option} value={option}>
                            {UNIT_KIND_LABELS[option] ?? option.replace(/_/g, " ")}
                        </option>
                    ))}
                </Select>
            </Field>

            <Field label="Parent unit" htmlFor="u-parent" dirty={isFieldDirty?.("parent_id")}>
                <Select
                    id="u-parent"
                    name="parent_id"
                    defaultValue={parentId}
                    dirty={isFieldDirty?.("parent_id")}
                >
                    <option value="">None (top level)</option>
                    {options.map(unit => (
                        <option key={unit.id} value={unit.id}>
                            {unit.name_en}
                        </option>
                    ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                    Nest inside another unit (e.g. Department inside Institute), or leave empty for top-level.
                </p>
            </Field>

            <div className="sm:col-span-2 lg:col-span-3">
                <Checkbox
                    id="u-is-autonomous"
                    name="is_autonomous"
                    label="Autonomous Unit (ស្ថាប័នស្វ័យភាព)"
                    description="Unit operates with high autonomy and hero-level branding (e.g. IFL or IISPP at RUPP)."
                    defaultChecked={defaultValue?.is_autonomous ?? false}
                    dirty={isFieldDirty?.("is_autonomous")}
                />
            </div>

            <Field label="Category (English)" htmlFor="u-category-en" dirty={isFieldDirty?.("category_en")}>
                <Input
                    id="u-category-en"
                    name="category_en"
                    placeholder="Engineering"
                    defaultValue={defaultValue?.category_en ?? ""}
                    dirty={isFieldDirty?.("category_en")}
                />
            </Field>

            <Field label="Category (Khmer)" htmlFor="u-category-kh" dirty={isFieldDirty?.("category_kh")}>
                <Input
                    id="u-category-kh"
                    name="category_kh"
                    defaultValue={defaultValue?.category_kh ?? ""}
                    dirty={isFieldDirty?.("category_kh")}
                />
            </Field>

            <Field label="Position / Order" htmlFor="u-position" dirty={isFieldDirty?.("position")}>
                <Input
                    id="u-position"
                    name="position"
                    type="number"
                    placeholder="0"
                    defaultValue={defaultValue?.position ?? 0}
                    dirty={isFieldDirty?.("position")}
                />
            </Field>

            <Field label="Logo URL" htmlFor="u-logo" className="lg:col-span-2" dirty={isFieldDirty?.("logo")}>
                <Input
                    id="u-logo"
                    name="logo"
                    placeholder="https://example.edu.kh/logo.png"
                    defaultValue={defaultValue?.logo ?? ""}
                    dirty={isFieldDirty?.("logo")}
                />
            </Field>

            <Field
                label="Unit Default Tuition / Year ($)"
                htmlFor="u-tuition"
                dirty={isFieldDirty?.("default_tuition_per_year")}
            >
                <Input
                    id="u-tuition"
                    name="default_tuition_per_year"
                    type="number"
                    placeholder="e.g. 1000"
                    defaultValue={defaultValue?.default_tuition_per_year ?? ""}
                    dirty={isFieldDirty?.("default_tuition_per_year")}
                />
                <p className="text-xs text-muted-foreground">
                    Optional: Uniform rate for all majors under this academic unit.
                </p>
            </Field>

            <Field
                label="Unit Female Tuition / Year ($)"
                htmlFor="u-tuition-female"
                dirty={isFieldDirty?.("default_tuition_female_per_year")}
            >
                <Input
                    id="u-tuition-female"
                    name="default_tuition_female_per_year"
                    type="number"
                    placeholder="e.g. 500"
                    defaultValue={defaultValue?.default_tuition_female_per_year ?? ""}
                    dirty={isFieldDirty?.("default_tuition_female_per_year")}
                />
                <p className="text-xs text-muted-foreground">
                    Optional: Female STEM incentive rate for this academic unit.
                </p>
            </Field>
        </div>
    );
}
