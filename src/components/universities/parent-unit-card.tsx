"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmButton from "@/components/ui/confirm-button";
import { Spinner } from "@/components/ui/feedback";
import UnitFields from "@/components/units/unit-fields";
import type { ProgramSummary, UnitSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
    Building2,
    ChevronRight,
    Copy,
    FolderTree,
    GraduationCap,
    Layers,
    Pencil,
    Plus,
    Sparkles,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import ChildUnitCard from "./child-unit-card";
import ProgramChip from "./program-chip";

export interface ParentUnitCardProps {
    unit: UnitSummary;
    childrenUnits: UnitSummary[];
    unitPrograms: ProgramSummary[];
    programsByUnitId: Record<string, ProgramSummary[]>;
    universityId: string;
    universitySlug?: string;
    defaultTuitionPerYear?: number | null;
    defaultTuitionFemalePerYear?: number | null;
    isCollapsed: boolean;
    isEditing: boolean;
    pending: boolean;
    allUnits: UnitSummary[];
    onToggleCollapse: (unitId: string | number) => void;
    onStartEdit: (unitId: string) => void;
    onCancelEdit: () => void;
    onUpdate: (unit: UnitSummary) => (e: FormEvent<HTMLFormElement>) => void;
    onClone: (unit: UnitSummary) => void;
    onDelete: (unit: UnitSummary) => () => Promise<void>;
    onQuickAdd: (unit: UnitSummary) => void;
    onBatchAdd: (unit: UnitSummary) => void;
    onAddDepartment: (unit: UnitSummary) => void;
    onEditProgram: (program: ProgramSummary) => void;
    onCloneProgram: (program: ProgramSummary) => void;
    onDeleteProgram: (program: ProgramSummary) => () => Promise<void>;
}

export type FacultyCardProps = ParentUnitCardProps;

export function ParentUnitCard({
    unit,
    childrenUnits,
    unitPrograms,
    programsByUnitId,
    universityId,
    universitySlug,
    defaultTuitionPerYear,
    defaultTuitionFemalePerYear,
    isCollapsed,
    isEditing,
    pending,
    allUnits,
    onToggleCollapse,
    onStartEdit,
    onCancelEdit,
    onUpdate,
    onClone,
    onDelete,
    onQuickAdd,
    onBatchAdd,
    onAddDepartment,
    onEditProgram,
    onCloneProgram,
    onDeleteProgram,
}: FacultyCardProps) {
    let totalPrograms = unitPrograms.length;
    for (const child of childrenUnits) {
        totalPrograms += (programsByUnitId[String(child.id)] ?? []).length;
    }

    if (isEditing) {
        return (
            <div className="rounded-xl border border-primary/30 bg-card p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                        <Pencil className="size-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold">Edit “{unit.name_en}”</h4>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={onCancelEdit}
                    >
                        Cancel
                    </Button>
                </div>
                <form onSubmit={onUpdate(unit)} className="space-y-4">
                    <UnitFields defaultValue={unit} siblings={allUnits} />
                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={onCancelEdit}
                            disabled={pending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={pending}>
                            {pending ? <Spinner className="size-3.5" /> : null}
                            {pending ? "Saving…" : "Save changes"}
                        </Button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border/80 bg-card shadow-2xs hover:border-border transition-colors overflow-hidden">
            {/* Faculty Header Row */}
            <div
                onClick={() => onToggleCollapse(unit.id)}
                className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/15 cursor-pointer select-none hover:bg-muted/25 transition-colors"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={e => {
                            e.stopPropagation();
                            onToggleCollapse(unit.id);
                        }}
                        className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
                        aria-label={isCollapsed ? "Expand" : "Collapse"}
                    >
                        <ChevronRight
                            className={cn(
                                "size-4.5 transition-transform duration-200 ease-out",
                                isCollapsed ? "rotate-0 text-muted-foreground" : "rotate-90 text-foreground",
                            )}
                        />
                    </button>

                    <Building2 className="size-5 text-foreground shrink-0" />

                    <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm sm:text-base text-foreground">
                                {unit.name_en}
                            </span>
                            {unit.name_kh && (
                                <span className="text-xs text-muted-foreground font-khmer">
                                    ({unit.name_kh})
                                </span>
                            )}
                            <Badge variant="outline" className="text-3xs uppercase tracking-wide px-1.5 py-0">
                                {unit.kind.replace(/_/g, " ")}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                            <span>
                                {childrenUnits.length} {childrenUnits.length === 1 ? "department" : "departments"} ·{" "}
                                {totalPrograms} {totalPrograms === 1 ? "program" : "programs"}
                            </span>
                            {unit.default_tuition_per_year ? (
                                <span className="text-2xs font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.2 rounded-full">
                                    Default: ${unit.default_tuition_per_year.toLocaleString()}/yr
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0"
                >
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs font-medium gap-1 rounded-md"
                        onClick={() => onQuickAdd(unit)}
                        title="Add degree program to this faculty"
                    >
                        <Plus className="size-3.5" />
                        <span>Add Program</span>
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs font-medium gap-1 rounded-md text-primary hover:text-primary bg-primary/5 hover:bg-primary/10 border-primary/20"
                        onClick={() => onBatchAdd(unit)}
                        title="Batch add multiple programs from a list"
                    >
                        <Sparkles className="size-3" />
                        <span>Batch</span>
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs font-medium gap-1 rounded-md"
                        onClick={() => onAddDepartment(unit)}
                        title="Add department under this faculty"
                    >
                        <Plus className="size-3.5" />
                        <span>Add Dept</span>
                    </Button>

                    <Link
                        href={`/universities/${universitySlug ?? universityId}/units/${unit.slug ?? unit.id}`}
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="View unit details page"
                    >
                        <Layers className="size-3.5" />
                    </Link>

                    <Button
                        size="sm"
                        variant="ghost"
                        className="size-7 p-0 rounded-md text-muted-foreground hover:text-foreground"
                        onClick={() => onClone(unit)}
                        disabled={pending}
                        title={`Clone “${unit.name_en}”`}
                    >
                        <Copy className="size-3.5" />
                    </Button>

                    <Button
                        size="sm"
                        variant="ghost"
                        className="size-7 p-0 rounded-md text-muted-foreground hover:text-foreground"
                        onClick={() => onStartEdit(unit.id)}
                        title="Edit faculty"
                    >
                        <Pencil className="size-3.5" />
                    </Button>

                    <ConfirmButton
                        onConfirm={onDelete(unit)}
                        confirmLabel={`Delete “${unit.name_en}”?`}
                        title={`Delete “${unit.name_en}”`}
                        className="size-7 p-0 rounded-md"
                    >
                        <Trash2 className="size-3.5" />
                    </ConfirmButton>
                </div>
            </div>

            {/* Expanded Hierarchy Content */}
            <div
                className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-out",
                    isCollapsed ? "grid-rows-[0fr] pointer-events-none" : "grid-rows-[1fr]",
                )}
            >
                <div className="overflow-hidden min-h-0">
                    <div className="p-4 border-t bg-muted/5 space-y-4">
                        {/* Child Departments */}
                        {childrenUnits.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <FolderTree className="size-3.5 text-muted-foreground" />
                                    <span>Departments ({childrenUnits.length})</span>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-1">
                                    {childrenUnits.map(child => (
                                        <ChildUnitCard
                                            key={child.id}
                                            child={child}
                                            childPrograms={programsByUnitId[String(child.id)] ?? []}
                                            universityId={universityId}
                                            universitySlug={universitySlug}
                                            defaultTuitionPerYear={defaultTuitionPerYear}
                                            defaultTuitionFemalePerYear={defaultTuitionFemalePerYear}
                                            pending={pending}
                                            isEditing={isEditing}
                                            allUnits={allUnits}
                                            onStartEdit={onStartEdit}
                                            onCancelEdit={onCancelEdit}
                                            onUpdate={onUpdate}
                                            onClone={onClone}
                                            onDelete={onDelete}
                                            onQuickAdd={onQuickAdd}
                                            onBatchAdd={onBatchAdd}
                                            onEditProgram={onEditProgram}
                                            onCloneProgram={onCloneProgram}
                                            onDeleteProgram={onDeleteProgram}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Direct Programs under Faculty */}
                        {unitPrograms.length > 0 && (
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        <GraduationCap className="size-3.5 text-muted-foreground" />
                                        <span>
                                            {childrenUnits.length > 0 ? "Direct Faculty Programs" : "Degree Programs"} ({unitPrograms.length})
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 px-2 text-2xs font-medium gap-1"
                                            onClick={() => onQuickAdd(unit)}
                                        >
                                            <Plus className="size-3" />
                                            <span>Add Program</span>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 px-1.5 text-2xs font-medium gap-1 text-primary hover:text-primary bg-primary/5 hover:bg-primary/10 border-primary/20"
                                            onClick={() => onBatchAdd(unit)}
                                        >
                                            <Sparkles className="size-3" />
                                            <span>Batch</span>
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {unitPrograms.map(prog => (
                                        <ProgramChip
                                            key={prog.id}
                                            program={prog}
                                            unit={unit}
                                            defaultTuitionPerYear={defaultTuitionPerYear}
                                            defaultTuitionFemalePerYear={defaultTuitionFemalePerYear}
                                            onEdit={onEditProgram}
                                            onClone={onCloneProgram}
                                            onDelete={onDeleteProgram(prog)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty state for leaf faculty with no departments and no programs */}
                        {childrenUnits.length === 0 && unitPrograms.length === 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border border-dashed bg-muted/20 text-xs text-muted-foreground">
                                <span>No departments or degree programs assigned to this faculty yet.</span>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs gap-1"
                                        onClick={() => onQuickAdd(unit)}
                                    >
                                        <Plus className="size-3" />
                                        Add Program
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs gap-1 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
                                        onClick={() => onBatchAdd(unit)}
                                    >
                                        <Sparkles className="size-3" />
                                        Batch
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs gap-1"
                                        onClick={() => onAddDepartment(unit)}
                                    >
                                        <Plus className="size-3" />
                                        Add Dept
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export { ParentUnitCard as FacultyCard };
export default ParentUnitCard;
