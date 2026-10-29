import type { ProgramSummary, UnitSummary } from "@/lib/types";

export interface ResolvedTuition {
    effectiveTuition: number | null;
    effectiveFemale: number | null;
    discountPercent: number | null;
    source: "program" | "unit" | "university" | "none";
    sourceLabel: string;
}

/**
 * Resolves effective tuition following the 3-tier cascade:
 * Program -> Unit -> University.
 */
export function resolveProgramTuition(
    program: ProgramSummary,
    unit?: UnitSummary | null,
    universityDefaultTuition?: number | null,
    universityDefaultFemale?: number | null,
): ResolvedTuition {
    let effectiveTuition: number | null = null;
    let source: "program" | "unit" | "university" | "none" = "none";
    let sourceLabel = "Not configured";

    if (program.tuition_per_year !== null && program.tuition_per_year !== undefined) {
        effectiveTuition = program.tuition_per_year;
        source = "program";
        sourceLabel = "Custom rate";
    } else if (unit?.default_tuition_per_year !== null && unit?.default_tuition_per_year !== undefined) {
        effectiveTuition = unit.default_tuition_per_year;
        source = "unit";
        sourceLabel = `Inherited from ${unit.name_en}`;
    } else if (universityDefaultTuition !== null && universityDefaultTuition !== undefined) {
        effectiveTuition = universityDefaultTuition;
        source = "university";
        sourceLabel = "Inherited from University default";
    }

    let effectiveFemale: number | null = null;
    if (program.tuition_female_per_year !== null && program.tuition_female_per_year !== undefined) {
        effectiveFemale = program.tuition_female_per_year;
    } else if (program.tuition_per_year === null || program.tuition_per_year === undefined) {
        if (unit?.default_tuition_female_per_year !== null && unit?.default_tuition_female_per_year !== undefined) {
            effectiveFemale = unit.default_tuition_female_per_year;
        } else if (universityDefaultFemale !== null && universityDefaultFemale !== undefined) {
            effectiveFemale = universityDefaultFemale;
        }
    }

    let discountPercent: number | null = null;
    if (
        effectiveTuition !== null &&
        effectiveFemale !== null &&
        effectiveFemale < effectiveTuition &&
        effectiveTuition > 0
    ) {
        discountPercent = Math.round(((effectiveTuition - effectiveFemale) / effectiveTuition) * 100);
    }

    return {
        effectiveTuition,
        effectiveFemale,
        discountPercent,
        source,
        sourceLabel,
    };
}
