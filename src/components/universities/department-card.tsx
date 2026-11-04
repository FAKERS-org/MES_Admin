"use client";

import { Button } from "@/components/ui/button";
import ConfirmButton from "@/components/ui/confirm-button";
import UnitFields from "@/components/units/unit-fields";
import type { ProgramSummary, UnitSummary } from "@/lib/types";
import { Copy, FolderTree, Layers, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import ProgramChip from "./program-chip";

export interface DepartmentCardProps {
    child: UnitSummary;
    childPrograms: ProgramSummary[];
    universityId: string;
    universitySlug?: string;
    defaultTuitionPerYear?: number | null;
    defaultTuitionFemalePerYear?: number | null;
    pending?: boolean;
    isEditing: boolean;
    allUnits: UnitSummary[];
    onStartEdit: (unitId: string) => void;
    onCancelEdit: () => void;
    onUpdate: (unit: UnitSummary) => (e: FormEvent<HTMLFormElement>) => void;
    onClone: (unit: UnitSummary) => void;
    onDelete: (unit: UnitSummary) => () => Promise<void>;
    onQuickAdd: (unit: UnitSummary) => void;
    onBatchAdd: (unit: UnitSummary) => void;
    onEditProgram: (program: ProgramSummary) => void;
    onCloneProgram: (program: ProgramSummary) => void;
    onDeleteProgram: (program: ProgramSummary) => () => Promise<void>;
}

export function DepartmentCard({
    child,
    childPrograms,
    universityId,
    universitySlug,
    defaultTuitionPerYear,
    defaultTuitionFemalePerYear,
    pending,
    isEditing,
    allUnits,
    onStartEdit,
    onCancelEdit,
    onUpdate,
    onClone,
    onDelete,
    onQuickAdd,
    onBatchAdd,
    onEditProgram,
    onCloneProgram,
    onDeleteProgram,
}: DepartmentCardProps) {
    if (isEditing) {
        return (
            <div className="p-3.5 bg-card rounded-xl border border-primary/30 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Edit “{child.name_en}”</p>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={onCancelEdit}
                    >
                        Cancel
                    </Button>
                </div>
                <form onSubmit={onUpdate(child)} className="space-y-3">
                    <UnitFields defaultValue={child} siblings={allUnits} />
                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={onCancelEdit}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={pending}>
                            Save
                        </Button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2.5 shadow-2xs hover:border-border transition-colors">
            {/* Department Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <FolderTree className="size-4 text-foreground/80 shrink-0" />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-xs sm:text-sm text-foreground">
                                {child.name_en}
                            </span>
                            {child.name_kh && (
                                <span className="text-xs text-muted-foreground font-khmer">
                                    ({child.name_kh})
                                </span>
                            )}
                        </div>
                        <p className="text-2xs text-muted-foreground">
                            {childPrograms.length} {childPrograms.length === 1 ? "degree program" : "degree programs"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-2xs font-medium gap-1 rounded-md"
                        onClick={() => onQuickAdd(child)}
                        title="Add degree program under this department"
                    >
                        <Plus className="size-3" />
                        <span>Add Program</span>
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-1.5 text-2xs font-medium gap-1 rounded-md text-primary hover:text-primary bg-primary/5 hover:bg-primary/10 border-primary/20"
                        onClick={() => onBatchAdd(child)}
                        title="Batch add multiple programs from a list"
                    >
                        <Sparkles className="size-3" />
                        <span>Batch</span>
                    </Button>
                    <Link
                        href={`/universities/${universitySlug ?? universityId}/units/${child.slug ?? child.id}`}
                        className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="View department details page"
                    >
                        <Layers className="size-3" />
                    </Link>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="size-6 p-0 rounded-md text-muted-foreground hover:text-foreground"
                        onClick={() => onClone(child)}
                        disabled={pending}
                        title={`Clone “${child.name_en}”`}
                    >
                        <Copy className="size-3" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="size-6 p-0 rounded-md text-muted-foreground hover:text-foreground"
                        onClick={() => onStartEdit(child.id)}
                        title="Edit department"
                    >
                        <Pencil className="size-3" />
                    </Button>
                    <ConfirmButton
                        onConfirm={onDelete(child)}
                        confirmLabel={`Delete “${child.name_en}”?`}
                        title={`Delete “${child.name_en}”`}
                        className="size-6 p-0 rounded-md"
                    >
                        <Trash2 className="size-3" />
                    </ConfirmButton>
                </div>
            </div>

            {/* Department Programs */}
            {childPrograms.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pt-1">
                    {childPrograms.map(prog => (
                        <ProgramChip
                            key={prog.id}
                            program={prog}
                            unit={child}
                            defaultTuitionPerYear={defaultTuitionPerYear}
                            defaultTuitionFemalePerYear={defaultTuitionFemalePerYear}
                            onEdit={onEditProgram}
                            onClone={onCloneProgram}
                            onDelete={onDeleteProgram(prog)}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 rounded-lg border border-dashed bg-muted/20 text-2xs text-muted-foreground">
                    <span>No degree programs under this department yet.</span>
                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-3xs gap-1"
                            onClick={() => onQuickAdd(child)}
                        >
                            <Plus className="size-2.5" />
                            Add Program
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-3xs gap-1 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
                            onClick={() => onBatchAdd(child)}
                        >
                            <Sparkles className="size-2.5" />
                            Batch
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DepartmentCard;
