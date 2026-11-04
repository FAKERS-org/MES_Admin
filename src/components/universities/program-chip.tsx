"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmButton from "@/components/ui/confirm-button";
import { resolveProgramTuition } from "@/lib/tuition";
import type { ProgramSummary, UnitSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Copy, GraduationCap, Pencil, Trash2 } from "lucide-react";

export interface ProgramChipProps {
    program: ProgramSummary;
    unit: UnitSummary | null;
    defaultTuitionPerYear?: number | null;
    defaultTuitionFemalePerYear?: number | null;
    onEdit?: (program: ProgramSummary) => void;
    onClone?: (program: ProgramSummary) => void;
    onDelete?: () => void;
}

/** Clean, friendly program chip with degree badge and tuition */
export function ProgramChip({
    program,
    unit,
    defaultTuitionPerYear,
    defaultTuitionFemalePerYear,
    onEdit,
    onClone,
    onDelete,
}: ProgramChipProps) {
    const resolved = resolveProgramTuition(
        program,
        unit,
        defaultTuitionPerYear,
        defaultTuitionFemalePerYear,
    );

    return (
        <div className="group flex items-center justify-between gap-2.5 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
                <GraduationCap className="size-4 text-foreground/80 shrink-0" />
                <div className="min-w-0">
                    <p className="font-medium text-xs text-foreground truncate" title={program.name_en}>
                        {program.name_en}
                    </p>
                    {program.name_kh && (
                        <p className="text-3xs text-muted-foreground font-khmer truncate">
                            {program.name_kh}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-3xs uppercase font-medium px-1.5 py-0">
                            {program.degree_level}
                        </Badge>
                        <span className="font-semibold text-xs text-foreground">
                            {formatCurrency(resolved.effectiveTuition, program.fee_currency)}/yr
                        </span>
                    </div>
                    {resolved.effectiveFemale && (
                        <span className="text-rose-600 dark:text-rose-400 font-medium text-3xs">
                            ♀ {formatCurrency(resolved.effectiveFemale, program.fee_currency)}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-0.5">
                    {onClone && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="size-6 p-0 rounded-md text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                            onClick={e => {
                                e.stopPropagation();
                                onClone(program);
                            }}
                            title={`Duplicate ${program.name_en}`}
                        >
                            <Copy className="size-3" />
                        </Button>
                    )}

                    {onEdit && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="size-6 p-0 rounded-md text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                            onClick={e => {
                                e.stopPropagation();
                                onEdit(program);
                            }}
                            title={`Edit ${program.name_en}`}
                        >
                            <Pencil className="size-3" />
                        </Button>
                    )}

                    {onDelete && (
                        <ConfirmButton
                            onConfirm={onDelete}
                            confirmLabel={`Delete “${program.name_en}”?`}
                            title={`Delete “${program.name_en}”`}
                            className="size-6 p-0 rounded-md"
                        >
                            <Trash2 className="size-3" />
                        </ConfirmButton>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProgramChip;
