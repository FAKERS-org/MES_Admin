"use client";

import { useState } from "react";
import { FolderTree, GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ProgramManager from "@/components/universities/program-manager";
import UnitManager from "@/components/universities/unit-manager";
import type { ProgramSummary, UnitSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AcademicManagerProps {
    universityId: string;
    universitySlug?: string;
    units: UnitSummary[];
    programs?: ProgramSummary[];
    defaultTuitionPerYear?: number | null;
    defaultTuitionFemalePerYear?: number | null;
}

export default function AcademicManager({
    universityId,
    universitySlug,
    units,
    programs = [],
    defaultTuitionPerYear,
    defaultTuitionFemalePerYear,
}: AcademicManagerProps) {
    // If university has units, default to "units" (Unit Hierarchy). If flat, default to "programs".
    const [activeTab, setActiveTab] = useState<"units" | "programs">(
        units.length > 0 ? "units" : "programs",
    );

    return (
        <Card className="overflow-hidden border border-border shadow-xs">
            {/* Elevated Section Header */}
            <div className="border-b bg-card px-5 py-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <GraduationCap className="size-6 text-foreground shrink-0" />
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-semibold text-foreground tracking-tight">
                                    Academic Management
                                </h2>
                                <Badge variant="outline" className="text-2xs font-normal">
                                    {units.length > 0 ? "Hierarchical Structure" : "Flat Structure"}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {units.length === 0
                                    ? "All degree programs belong directly to this institution."
                                    : `Manage ${units.length} academic unit${units.length === 1 ? "" : "s"} and ${programs.length} degree program${programs.length === 1 ? "" : "s"}.`}
                            </p>
                        </div>
                    </div>

                    {/* Prominent Tab Switcher */}
                    <div className="flex items-center rounded-xl bg-muted/80 p-1 border text-xs self-start sm:self-auto shadow-2xs">
                        <button
                            type="button"
                            onClick={() => setActiveTab("units")}
                            className={cn(
                                "flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-medium transition-all cursor-pointer",
                                activeTab === "units"
                                    ? "bg-background text-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <FolderTree className="size-3.5" />
                            <span>Unit Hierarchy</span>
                            <span
                                className={cn(
                                    "rounded-full px-1.5 py-0.2 text-3xs font-semibold",
                                    activeTab === "units"
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted-foreground/15 text-muted-foreground",
                                )}
                            >
                                {units.length}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("programs")}
                            className={cn(
                                "flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-medium transition-all cursor-pointer",
                                activeTab === "programs"
                                    ? "bg-background text-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <GraduationCap className="size-3.5" />
                            <span>All Programs</span>
                            <span
                                className={cn(
                                    "rounded-full px-1.5 py-0.2 text-3xs font-semibold",
                                    activeTab === "programs"
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted-foreground/15 text-muted-foreground",
                                )}
                            >
                                {programs.length}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <CardContent className="p-5">
                {activeTab === "units" ? (
                    <UnitManager
                        universityId={universityId}
                        universitySlug={universitySlug}
                        units={units}
                        programs={programs}
                        defaultTuitionPerYear={defaultTuitionPerYear}
                        defaultTuitionFemalePerYear={defaultTuitionFemalePerYear}
                    />
                ) : (
                    <ProgramManager
                        universityId={universityId}
                        programs={programs}
                        units={units}
                        defaultTuitionPerYear={defaultTuitionPerYear}
                        defaultTuitionFemalePerYear={defaultTuitionFemalePerYear}
                    />
                )}
            </CardContent>
        </Card>
    );
}
