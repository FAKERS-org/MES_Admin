"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Layers, Plus, Sparkles, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
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
    type StudyShift,
    type UnitSummary,
    type UniversitySummary,
} from "@/lib/types";

export interface ParsedLine {
    id: string;
    name_en: string;
    name_kh: string | null;
}

const KHMER_REGEX = /[\u1780-\u17FF]/;

/** Helper to parse a line into English and optional Khmer names */
export function parseProgramLine(line: string, index: number): ParsedLine | null {
    // Strip bullet points: "1. ", "1) ", "- ", "* ", "• "
    let clean = line.replace(/^\s*(?:\d+[\.\)]|[-*•])\s*/, "").trim();
    if (!clean || clean.startsWith("#") || clean.startsWith("//")) return null;

    let nameEn = "";
    let nameKh: string | null = null;

    if (clean.includes("/")) {
        const parts = clean.split("/").map(s => s.trim());
        if (parts.length >= 2) {
            if (KHMER_REGEX.test(parts[0]) && !KHMER_REGEX.test(parts[1])) {
                nameKh = parts[0];
                nameEn = parts[1];
            } else {
                nameEn = parts[0];
                nameKh = parts[1] || null;
            }
        }
    } else if (clean.includes("(") && clean.endsWith(")")) {
        const match = clean.match(/^([^(]+)\(([^)]+)\)$/);
        if (match) {
            const part1 = match[1].trim();
            const part2 = match[2].trim();
            if (KHMER_REGEX.test(part2)) {
                nameEn = part1;
                nameKh = part2;
            } else if (KHMER_REGEX.test(part1)) {
                nameKh = part1;
                nameEn = part2;
            } else {
                nameEn = clean;
            }
        }
    } else if (clean.includes("-") && clean.split("-").length === 2) {
        const parts = clean.split("-").map(s => s.trim());
        if (KHMER_REGEX.test(parts[0]) && !KHMER_REGEX.test(parts[1])) {
            nameKh = parts[0];
            nameEn = parts[1];
        } else if (!KHMER_REGEX.test(parts[0]) && KHMER_REGEX.test(parts[1])) {
            nameEn = parts[0];
            nameKh = parts[1];
        } else {
            nameEn = clean;
        }
    } else {
        nameEn = clean;
    }

    if (!nameEn) return null;

    return {
        id: `prog-${index}-${Date.now()}`,
        name_en: nameEn,
        name_kh: nameKh,
    };
}

export function BatchProgramModal({
    isOpen,
    onClose,
    universityId,
    universities,
    units = [],
    defaultUnitId,
    defaultTuitionPerYear,
    onSuccess,
}: {
    isOpen: boolean;
    onClose: () => void;
    universityId?: string | number | null;
    universities?: UniversitySummary[];
    units?: UnitSummary[];
    defaultUnitId?: string | number | null;
    defaultTuitionPerYear?: number | null;
    onSuccess: (created: ProgramSummary[]) => void;
}) {
    const [selectedUniId, setSelectedUniId] = useState<string>(
        universityId ? String(universityId) : (universities?.[0]?.id ? String(universities[0].id) : ""),
    );
    const [selectedUnit, setSelectedUnit] = useState<string>(
        defaultUnitId ? String(defaultUnitId) : "",
    );
    const [degreeLevel, setDegreeLevel] = useState<DegreeLevel>("BACHELOR");
    const [durationYears, setDurationYears] = useState<number>(4);
    const [tuitionPerYear, setTuitionPerYear] = useState<string>(
        defaultTuitionPerYear ? String(defaultTuitionPerYear) : "",
    );
    const [currency, setCurrency] = useState<Currency>("USD");
    const [selectedShifts, setSelectedShifts] = useState<StudyShift[]>(["MORNING", "AFTERNOON"]);
    const [rawText, setRawText] = useState("");
    const [customList, setCustomList] = useState<ParsedLine[] | null>(null);

    const [pending, startTransition] = useTransition();
    const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Auto-update duration defaults when degree level changes
    const handleDegreeChange = (level: DegreeLevel) => {
        setDegreeLevel(level);
        if (level === "BACHELOR") setDurationYears(4);
        else if (level === "ENGINEERING") setDurationYears(5);
        else if (level === "ASSOCIATE" || level === "DIPLOMA") setDurationYears(2);
        else if (level === "MASTER") setDurationYears(2);
        else if (level === "PHD") setDurationYears(3);
    };

    // Auto-parse lines whenever rawText changes unless user edited customList
    const parsedLines: ParsedLine[] = useMemo(() => {
        if (customList !== null) return customList;
        return rawText
            .split("\n")
            .map((line, idx) => parseProgramLine(line, idx))
            .filter((p): p is ParsedLine => p !== null);
    }, [rawText, customList]);

    const handleTextChange = (value: string) => {
        setRawText(value);
        setCustomList(null);
    };

    const removeItem = (id: string) => {
        const next = parsedLines.filter(p => p.id !== id);
        setCustomList(next);
    };

    const toggleShift = (shift: StudyShift) => {
        setSelectedShifts(prev =>
            prev.includes(shift) ? prev.filter(s => s !== shift) : [...prev, shift],
        );
    };

    // Selected unit resolution
    const activeUnitObj = useMemo(() => {
        if (!selectedUnit) return null;
        return units.find(u => String(u.id) === selectedUnit) ?? null;
    }, [selectedUnit, units]);

    const handleSubmit = async () => {
        if (parsedLines.length === 0) {
            setError("Please enter or paste at least one program name.");
            return;
        }

        setError(null);
        setProgress({ current: 0, total: parsedLines.length });

        startTransition(async () => {
            const createdList: ProgramSummary[] = [];
            const failedLines: string[] = [];

            let facultyLabel: string | null = null;
            let unitIdVal: number | null = null;

            if (activeUnitObj) {
                unitIdVal = Number(activeUnitObj.id);
                if (activeUnitObj.parent_id) {
                    const parent = units.find(u => u.id === activeUnitObj.parent_id);
                    facultyLabel = parent ? parent.name_en : activeUnitObj.name_en;
                } else {
                    facultyLabel = activeUnitObj.name_en;
                }
            }

            for (let i = 0; i < parsedLines.length; i++) {
                const item = parsedLines[i];
                setProgress({ current: i + 1, total: parsedLines.length });

                const payload: ProgramCreatePayload = {
                    name_en: item.name_en,
                    name_kh: item.name_kh,
                    faculty: facultyLabel,
                    unit_id: unitIdVal,
                    degree_level: degreeLevel,
                    duration_years: durationYears,
                    tuition_per_year: tuitionPerYear ? Number(tuitionPerYear) : null,
                    tuition_female_per_year: null,
                    tuition_per_credit: null,
                    fee_currency: currency,
                    shifts: selectedShifts.length > 0 ? selectedShifts : null,
                };

                try {
                    const res = await apiRequest<ProgramSummary>(
                        `/api/admin/universities/${universityId}/programs`,
                        {
                            method: "POST",
                            body: payload,
                        },
                    );
                    createdList.push(res);
                } catch {
                    failedLines.push(
                        item.name_kh ? `${item.name_en} / ${item.name_kh}` : item.name_en,
                    );
                }
            }

            setProgress(null);

            if (createdList.length > 0) {
                onSuccess(createdList);
            }

            if (failedLines.length > 0) {
                setError(
                    `Created ${createdList.length} programs, but ${failedLines.length} failed. Unsuccessful items are retained in the box.`,
                );
                setRawText(failedLines.join("\n"));
                setCustomList(null);
            } else {
                // All succeeded
                setRawText("");
                setCustomList(null);
                onClose();
            }
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Batch Add Programs (បញ្ចូលកម្មវិធីសិក្សាជាក្រុម)"
            icon={<Sparkles className="size-5 text-primary" />}
            maxWidth="max-w-3xl"
        >
            <div className="space-y-4 text-xs">
                <p className="text-muted-foreground text-xs">
                    Quickly add multiple degree programs at once by pasting a list of majors. Shared settings like degree level, duration, and tuition are applied automatically.
                </p>

                {error && <Alert variant="destructive">{error}</Alert>}

                {/* Common Settings Bar */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-3 rounded-xl border bg-muted/20">
                    <Field label="Target Unit / Faculty" htmlFor="batch-unit">
                        <Select
                            id="batch-unit"
                            value={selectedUnit}
                            onChange={e => setSelectedUnit(e.target.value)}
                            className="h-8.5 text-xs bg-background"
                        >
                            <option value="">Standalone (Institution-Wide)</option>
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

                    <Field label="Degree Level" htmlFor="batch-degree">
                        <Select
                            id="batch-degree"
                            value={degreeLevel}
                            onChange={e => handleDegreeChange(e.target.value as DegreeLevel)}
                            className="h-8.5 text-xs bg-background"
                        >
                            {DEGREE_LEVELS.map(level => (
                                <option key={level} value={level}>
                                    {level}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Field label="Duration (Years)" htmlFor="batch-duration">
                        <Input
                            id="batch-duration"
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="10"
                            value={durationYears}
                            onChange={e => setDurationYears(Number(e.target.value) || 1)}
                            className="h-8.5 text-xs bg-background"
                        />
                    </Field>

                    <Field label="Tuition / Year (USD)" htmlFor="batch-tuition">
                        <Input
                            id="batch-tuition"
                            type="number"
                            placeholder={defaultTuitionPerYear ? `Inherit ($${defaultTuitionPerYear})` : "Optional fee"}
                            value={tuitionPerYear}
                            onChange={e => setTuitionPerYear(e.target.value)}
                            className="h-8.5 text-xs bg-background"
                        />
                    </Field>
                </div>

                {/* Shifts checklist */}
                <div className="space-y-1.5">
                    <label className="text-2xs font-medium text-foreground">Available Study Shifts</label>
                    <div className="flex flex-wrap gap-2">
                        {STUDY_SHIFTS.map(shift => {
                            const isChecked = selectedShifts.includes(shift);
                            const info = STUDY_SHIFT_LABELS[shift];
                            return (
                                <button
                                    key={shift}
                                    type="button"
                                    onClick={() => toggleShift(shift)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-2xs cursor-pointer transition-colors ${isChecked
                                            ? "bg-primary/10 border-primary text-primary font-medium"
                                            : "bg-background text-muted-foreground hover:bg-muted/40"
                                        }`}
                                >
                                    <span>{info.kh} ({info.en})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Multiline Input Textarea */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label htmlFor="batch-raw-text" className="text-xs font-semibold text-foreground">
                            Paste Majors / Programs (One per line)
                        </label>
                        <span className="text-3xs text-muted-foreground">
                            Supports “English / Khmer” or “English (Khmer)”
                        </span>
                    </div>
                    <textarea
                        id="batch-raw-text"
                        rows={6}
                        value={rawText}
                        onChange={e => handleTextChange(e.target.value)}
                        placeholder={`Civil Engineering / វិស្វកម្មសំណង់ស៊ីវិល\nElectrical & Energy Engineering\nComputer Science & Engineering (វិស្វកម្មវិទ្យាសាស្ត្រកុំព្យូទ័រ)\nTelecommunications and Networking\nFood Technology`}
                        className="w-full rounded-xl border border-input bg-background p-3 font-mono text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                </div>

                {/* Live Parsed Preview */}
                {parsedLines.length > 0 && (
                    <div className="space-y-2 border rounded-xl p-3 bg-muted/10">
                        <div className="flex items-center justify-between text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="size-3.5 text-emerald-600" />
                                Ready to create ({parsedLines.length} programs)
                            </span>
                            <span className="text-3xs lowercase font-normal text-muted-foreground">
                                target: {activeUnitObj?.name_en ?? "Standalone"} · {degreeLevel} · {durationYears}yr
                            </span>
                        </div>

                        <div className="max-h-48 overflow-y-auto divide-y rounded-lg border bg-background text-xs">
                            {parsedLines.map((item, idx) => (
                                <div key={item.id} className="flex items-center justify-between gap-3 p-2 hover:bg-muted/30">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-3xs text-muted-foreground w-4 text-right">
                                            {idx + 1}.
                                        </span>
                                        <div className="min-w-0 truncate">
                                            <span className="font-medium text-foreground">{item.name_en}</span>
                                            {item.name_kh && (
                                                <span className="ml-1.5 text-muted-foreground font-khmer text-2xs">
                                                    · {item.name_kh}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="outline" className="text-3xs px-1.5 py-0 font-normal">
                                            {degreeLevel}
                                        </Badge>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            className="size-6 p-0 inline-flex items-center justify-center rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                                            title="Remove from batch"
                                        >
                                            <Trash2 className="size-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Progress bar when submitting */}
                {progress && (
                    <div className="space-y-1.5 py-2">
                        <div className="flex justify-between text-2xs text-muted-foreground font-medium">
                            <span>Creating programs in database...</span>
                            <span>{progress.current} / {progress.total}</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-200"
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                    <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={pending}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        disabled={pending || parsedLines.length === 0}
                        onClick={handleSubmit}
                        className="gap-1.5 shadow-2xs font-medium"
                    >
                        {pending ? <Spinner className="size-3.5" /> : <Plus className="size-3.5" />}
                        {pending
                            ? `Creating (${progress?.current ?? 0}/${parsedLines.length})…`
                            : `Create ${parsedLines.length} Program${parsedLines.length === 1 ? "" : "s"}`}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

