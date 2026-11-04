"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import {
    CURRENCIES,
    DEGREE_LEVELS,
    STUDY_SHIFTS,
    STUDY_SHIFT_LABELS,
    type Currency,
    type DegreeLevel,
    type ProgramCreatePayload,
    type ProgramSummary,
    type StudyShift,
    type UnitSummary,
} from "@/lib/types";

export function raw(form: FormData, key: string): string {
    return String(form.get(key) ?? "").trim();
}

export function nullable(form: FormData, key: string): string | null {
    return raw(form, key) || null;
}

export function numberOrNull(form: FormData, key: string): number | null {
    const value = raw(form, key);
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

/** Shared FormData parser for creating/updating a program */
export function programPayload(form: FormData, units: UnitSummary[] = []): ProgramCreatePayload {
    const unitIdRaw = raw(form, "unit_id");
    const unitId = unitIdRaw ? Number(unitIdRaw) : null;
    const selectedUnit = units.find(u => String(u.id) === unitIdRaw);
    let faculty = nullable(form, "faculty");
    if (selectedUnit) {
        if (selectedUnit.parent_id) {
            const parent = units.find(u => u.id === selectedUnit.parent_id);
            faculty = parent ? parent.name_en : selectedUnit.name_en;
        } else {
            faculty = selectedUnit.name_en;
        }
    }

    const shifts = form.getAll("shifts") as StudyShift[];

    return {
        name_en: raw(form, "name_en"),
        name_kh: nullable(form, "name_kh"),
        faculty,
        unit_id: unitId,
        degree_level: (raw(form, "degree_level") as DegreeLevel) || "BACHELOR",
        duration_years: Number(raw(form, "duration_years") || 4),
        tuition_per_year: numberOrNull(form, "tuition_per_year"),
        tuition_female_per_year: numberOrNull(form, "tuition_female_per_year"),
        tuition_per_credit: numberOrNull(form, "tuition_per_credit"),
        fee_currency: (raw(form, "fee_currency") as Currency) || "USD",
        shifts: shifts.length > 0 ? shifts : null,
        language_track: nullable(form, "language_track"),
        cqf_level: nullable(form, "cqf_level"),
        field_of_study: nullable(form, "field_of_study"),
    };
}

export interface ProgramFieldsProps {
    defaultValue?: Partial<ProgramSummary>;
    units?: UnitSummary[];
    defaultTuitionPerYear?: number | null;
}

/** Shared field layout for the create and edit program forms. */
export default function ProgramFields({
    defaultValue,
    units = [],
    defaultTuitionPerYear,
}: ProgramFieldsProps) {
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

            <Field label="Language Track" htmlFor="p-lang">
                <Input
                    id="p-lang"
                    name="language_track"
                    placeholder="e.g. Khmer, English, Bilingual, French"
                    defaultValue={defaultValue?.language_track ?? ""}
                />
            </Field>

            <Field label="CQF Level" htmlFor="p-cqf">
                <Input
                    id="p-cqf"
                    name="cqf_level"
                    placeholder="e.g. Level 6 (Bachelor)"
                    defaultValue={defaultValue?.cqf_level ?? ""}
                />
            </Field>

            <Field label="Field of Study" htmlFor="p-field">
                <Input
                    id="p-field"
                    name="field_of_study"
                    placeholder="e.g. STEM, Business, Law"
                    defaultValue={defaultValue?.field_of_study ?? ""}
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

export { ProgramFields };
