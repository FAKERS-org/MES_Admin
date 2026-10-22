"use client";

import { ExternalLink, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api";
import {
    PROVINCES,
    type CampusSummary,
    type UniversityCreatePayload,
    type UniversitySummary,
    type UniversityType,
} from "@/lib/types";

interface CampusManagerProps {
    universityId: string | number;
    universityName: string;
    universityType: UniversityType;
    abbreviation: string | null;
    campuses: CampusSummary[];
}

export default function CampusManager({
    universityId,
    universityName,
    universityType,
    abbreviation,
    campuses,
}: CampusManagerProps) {
    const router = useRouter();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function handleAddCampus(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        const form = new FormData(event.currentTarget);
        const campusName = String(form.get("campus_name") ?? "").trim();
        const province = String(form.get("province") ?? "").trim();
        const address = String(form.get("address") ?? "").trim() || null;
        const isMain = form.get("is_main_campus") === "on";

        if (!campusName || !province) {
            setError("Campus name and province are required.");
            return;
        }

        const payload: UniversityCreatePayload = {
            name_en: universityName,
            abbreviation: abbreviation,
            type: universityType,
            province,
            parent_id: Number(universityId),
            campus_name: campusName,
            is_main_campus: isMain,
        };

        startTransition(async () => {
            try {
                const created = await apiRequest<UniversitySummary>("/api/admin/universities", {
                    method: "POST",
                    body: payload,
                });

                // If address was provided, update it
                if (address) {
                    await apiRequest(`/api/admin/universities/${created.id}`, {
                        method: "PATCH",
                        body: { address },
                    });
                }

                setIsAddOpen(false);
                router.refresh();
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Failed to add campus.");
            }
        });
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-primary" />
                    <div>
                        <CardTitle>Campuses</CardTitle>
                        <CardDescription>
                            Physical branch locations with their own departments, contacts, and programs.
                        </CardDescription>
                    </div>
                </div>
                <Button size="sm" onClick={() => setIsAddOpen(true)}>
                    <Plus className="size-4" />
                    Add campus
                </Button>
            </CardHeader>
            <CardContent>
                {campuses.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        <p>No separate campuses registered for this university.</p>
                        <p className="text-xs mt-1">
                            Click &quot;Add campus&quot; to register a main campus or provincial branch.
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Campus Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Province</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {campuses.map(campus => (
                                <TableRow key={campus.id}>
                                    <TableCell className="font-medium">
                                        {campus.campus_name || "Branch Campus"}
                                    </TableCell>
                                    <TableCell>
                                        {campus.is_main_campus ? (
                                            <Badge variant="default">Main Campus</Badge>
                                        ) : (
                                            <Badge variant="outline">Branch</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{campus.province}</TableCell>
                                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                                        {campus.address || "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link
                                            href={`/universities/${campus.id}`}
                                            className={buttonVariants({ variant: "outline", size: "sm" })}
                                        >
                                            <ExternalLink className="size-3.5" />
                                            Manage campus
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <Modal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                title="Add New Campus"
                icon={<MapPin className="size-5 text-primary" />}
            >
                <form onSubmit={handleAddCampus} className="space-y-4">
                    {error ? <Alert>{error}</Alert> : null}

                    <Field label="Campus Name" htmlFor="campus_name" required>
                        <Input
                            id="campus_name"
                            name="campus_name"
                            placeholder="e.g. Main Campus (Tuol Kouk), Battambang Campus..."
                            required
                        />
                    </Field>

                    <Field label="Province" htmlFor="province" required>
                        <Select id="province" name="province" defaultValue={PROVINCES[0]} required>
                            {PROVINCES.map(p => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Field label="Address" htmlFor="address">
                        <Input id="address" name="address" placeholder="Physical street address..." />
                    </Field>

                    <Checkbox
                        id="is_main_campus"
                        name="is_main_campus"
                        label="Set as main campus"
                        description="Mark this location as the primary flagship campus."
                    />

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={pending}>
                            {pending ? <Spinner className="size-4" /> : "Create Campus"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </Card>
    );
}
