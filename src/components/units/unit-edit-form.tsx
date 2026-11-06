"use client";

import { Check, RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
    type FormEvent,
} from "react";

import { setBreadcrumbLabel } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Spinner } from "@/components/ui/feedback";
import UnitFields, { unitPayload } from "@/components/units/unit-fields";
import { apiRequest } from "@/lib/api";
import type { UnitSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Edit-only unit form for the unit detail page (create/delete live in the manager). */
export default function UnitEditForm({
    universityId,
    unitId,
    unit,
    siblings,
}: {
    universityId: string;
    unitId: string;
    unit: UnitSummary;
    siblings: UnitSummary[];
}) {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const initialValues = useMemo<Record<string, unknown>>(
        () => ({
            name_en: unit.name_en ?? "",
            name_kh: unit.name_kh ?? "",
            acronym: unit.acronym ?? "",
            kind: unit.kind ?? "FACULTY",
            parent_id: unit.parent_id ?? "",
            is_autonomous: Boolean(unit.is_autonomous),
            category_en: unit.category_en ?? "",
            category_kh: unit.category_kh ?? "",
            position: unit.position != null ? String(unit.position) : "0",
            logo: unit.logo ?? "",
            default_tuition_per_year:
                unit.default_tuition_per_year != null
                    ? String(unit.default_tuition_per_year)
                    : "",
            default_tuition_female_per_year:
                unit.default_tuition_female_per_year != null
                    ? String(unit.default_tuition_female_per_year)
                    : "",
        }),
        [unit]
    );

    const [dirtyFields, setDirtyFields] = useState<Record<string, boolean>>({});

    const checkFieldDirty = useCallback(
        (target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
            const name = target.name;
            if (!name || !(name in initialValues)) return;

            let isDifferent = false;
            if (target.type === "checkbox") {
                const checkbox = target as HTMLInputElement;
                isDifferent = Boolean(checkbox.checked) !== Boolean(initialValues[name]);
            } else {
                const currentTrimmed = target.value.trim();
                const initialTrimmed = String(initialValues[name] ?? "").trim();
                isDifferent = currentTrimmed !== initialTrimmed;
            }

            setDirtyFields(prev => {
                if (prev[name] === isDifferent) return prev;
                return { ...prev, [name]: isDifferent };
            });
        },
        [initialValues]
    );

    const isFieldDirty = useCallback((name: string) => Boolean(dirtyFields[name]), [dirtyFields]);
    const dirtyCount = useMemo(() => Object.values(dirtyFields).filter(Boolean).length, [dirtyFields]);
    const isDirty = dirtyCount > 0;

    useEffect(() => {
        setBreadcrumbLabel(`/universities/${universityId}/units/${unitId}`, unit.name_en);
    }, [universityId, unitId, unit.name_en]);

    // Warn before navigating away
    useEffect(() => {
        function handleBeforeUnload(e: BeforeUnloadEvent) {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = "";
            }
        }
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    // Shortcut
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                if (formRef.current && isDirty && !pending) {
                    formRef.current.requestSubmit();
                }
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isDirty, pending]);

    function handleReset() {
        formRef.current?.reset();
        setDirtyFields({});
        setError(null);
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const payload = unitPayload(new FormData(event.currentTarget));
        if (!payload.name_en) {
            setError("Name (English) is required.");
            return;
        }

        startTransition(async () => {
            try {
                const updated = await apiRequest<UnitSummary>(
                    `/api/admin/universities/${universityId}/units/${unitId}`,
                    { method: "PATCH", body: payload }
                );
                setBreadcrumbLabel(`/universities/${universityId}/units/${unitId}`, updated.name_en);
                setError(null);
                setSaved(`“${updated.name_en}” updated.`);
                setDirtyFields({});
                router.refresh();
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Could not update the unit.");
            }
        });
    }

    return (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            onInput={e => checkFieldDirty(e.target as any)}
            onChange={e => checkFieldDirty(e.target as any)}
            className="relative space-y-4"
        >
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle>Unit details</CardTitle>
                            {isDirty ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/25 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    {dirtyCount} unsaved
                                </span>
                            ) : null}
                        </div>
                        <CardDescription>Name, kind and category of this unit.</CardDescription>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {isDirty ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                disabled={pending}
                                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                            >
                                <RotateCcw className="size-3.5 mr-1" />
                                Discard
                            </Button>
                        ) : null}
                        <Button
                            type="submit"
                            size="sm"
                            disabled={pending || !isDirty}
                            className={cn(
                                "h-8 text-xs font-semibold transition-all shadow-xs",
                                isDirty && "shadow-sm shadow-primary/25"
                            )}
                        >
                            {pending ? <Spinner className="size-3.5" /> : <Save className="size-3.5" />}
                            {pending ? "Saving…" : isDirty ? "Save unit" : "Saved"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        {error ? <Alert>{error}</Alert> : null}
                        {saved && !error ? (
                            <Alert variant="success">
                                <span className="inline-flex items-center gap-1.5">
                                    <Check className="size-3.5" /> {saved}
                                </span>
                            </Alert>
                        ) : null}

                        <UnitFields
                            defaultValue={unit}
                            siblings={siblings}
                            isFieldDirty={isFieldDirty}
                        />

                        <div className="flex items-center justify-between gap-3 border-t pt-4">
                            <div className="text-xs text-muted-foreground">
                                {isDirty ? (
                                    <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                                        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        {dirtyCount} unsaved {dirtyCount === 1 ? "change" : "changes"}
                                    </span>
                                ) : (
                                    <span>All changes saved.</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {isDirty ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleReset}
                                        disabled={pending}
                                    >
                                        <RotateCcw className="size-3 mr-1" />
                                        Discard
                                    </Button>
                                ) : null}
                                <Button type="submit" size="sm" disabled={pending || !isDirty}>
                                    {pending ? <Spinner className="size-3.5" /> : <Save className="size-3.5" />}
                                    {pending ? "Saving…" : isDirty ? "Save unit" : "Saved"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sticky Floating Save Dock for mobile / long forms */}
            {isDirty ? (
                <div className="sticky bottom-6 z-40 mt-4 flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-card/95 px-4 py-3 shadow-xl backdrop-blur-md dark:bg-card/90 animate-in fade-in slide-in-from-bottom-3 duration-200">
                    <div className="flex items-center gap-2.5">
                        <span className="relative flex size-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
                        </span>
                        <div>
                            <p className="text-xs font-semibold text-foreground">
                                {dirtyCount} unsaved {dirtyCount === 1 ? "change" : "changes"}
                            </p>
                            <p className="text-[11px] text-muted-foreground hidden sm:block">
                                Click save or press <kbd className="rounded border bg-muted px-1 py-0.2 font-mono text-[10px]">Ctrl+S</kbd> to save.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleReset}
                            disabled={pending}
                            className="h-8 text-xs"
                        >
                            <RotateCcw className="size-3 mr-1" />
                            Discard
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={pending}
                            className="h-8 text-xs font-semibold shadow-md shadow-primary/25"
                        >
                            {pending ? <Spinner className="size-3" /> : <Save className="size-3" />}
                            {pending ? "Saving…" : "Save unit"}
                        </Button>
                    </div>
                </div>
            ) : null}
        </form>
    );
}
