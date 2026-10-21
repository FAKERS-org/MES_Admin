"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import { setBreadcrumbLabel } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Spinner } from "@/components/ui/feedback";
import UnitFields, { unitPayload } from "@/components/units/unit-fields";
import { apiRequest } from "@/lib/api";
import type { UnitSummary } from "@/lib/types";

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
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    useEffect(() => {
        setBreadcrumbLabel(`/universities/${universityId}/units/${unitId}`, unit.name_en);
    }, [universityId, unitId, unit.name_en]);

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
                router.refresh();
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Could not update the unit.");
            }
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Unit details</CardTitle>
                <CardDescription>Name, kind and category of this unit.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error ? <Alert>{error}</Alert> : null}
                    {saved && !error ? <Alert variant="success">{saved}</Alert> : null}

                    <UnitFields defaultValue={unit} siblings={siblings} />

                    <Button type="submit" size="sm" disabled={pending}>
                        {pending ? <Spinner className="size-3.5" /> : null}
                        {pending ? "Saving…" : "Save unit"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
