import { ArrowLeft, ExternalLink, Folder, MapPin, Newspaper } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { AccreditedBadge, StatusBadge, TypeBadge } from "@/components/universities/badges";
import CampusManager from "@/components/universities/campus-manager";
import DeleteUniversity from "@/components/universities/delete-university";
import ProgramManager from "@/components/universities/program-manager";
import PublishToggle from "@/components/universities/publish-toggle";
import UnitManager from "@/components/universities/unit-manager";
import UniversityEditForm from "@/components/universities/university-edit-form";
import { ApiError, apiList, apiRequest, publishedIds } from "@/lib/server-api";
import type { Status, UnitSummary, UniversityDetail, UniversitySummary } from "@/lib/types";

export const metadata = { title: "University" };
export const dynamic = "force-dynamic";

export default async function UniversityDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let university: UniversityDetail;
    try {
        university = await apiRequest<UniversityDetail>(`admin/universities/${id}`);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) notFound();
        throw error;
    }

    let parentUniversity: UniversitySummary | null = null;
    if (university.parent_id) {
        try {
            parentUniversity = await apiRequest<UniversitySummary>(`admin/universities/${university.parent_id}`);
        } catch {
            // Parent not accessible
        }
    }

    const published = await publishedIds();
    const status: Status = published.has(university.id) ? "PUBLISHED" : "DRAFT";

    // Units come from the admin API: the public list endpoint 403s while the
    // university is still a DRAFT, which would hide every unit.
    let units: UnitSummary[] = [];
    try {
        units = await apiList<UnitSummary>(`admin/universities/${id}/units/`);
    } catch {
        // API unreachable - units will render as empty state
    }

    return (
        <div className="space-y-5">
            {parentUniversity ? (
                <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-4 py-2 text-xs font-medium text-muted-foreground border">
                    <span>Branch campus of</span>
                    <Link
                        href={`/universities/${parentUniversity.id}`}
                        className="font-semibold text-foreground hover:underline inline-flex items-center gap-1"
                    >
                        {parentUniversity.name_en}
                        <ArrowLeft className="size-3 rotate-180" />
                    </Link>
                </div>
            ) : null}

            <PageHeader
                title={
                    <>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {university.name_en}
                            {university.campus_name ? (
                                <span className="ml-2 text-lg font-normal text-muted-foreground">
                                    — {university.campus_name}
                                </span>
                            ) : null}
                        </h1>
                        <StatusBadge status={status} />
                        <TypeBadge type={university.type} />
                        <AccreditedBadge accredited={university.moeys_accredited} />
                    </>
                }
                subtitle={
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {university.name_kh ? <span>{university.name_kh}</span> : null}
                        <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" />
                            {university.province}
                        </span>
                        {university.established_year ? <span>Est. {university.established_year}</span> : null}
                    </span>
                }
                actions={
                    <>
                        <Link href="/universities" className={buttonVariants({ variant: "ghost" })}>
                            <ArrowLeft className="size-4" />
                            Back to list
                        </Link>
                        {university.website ? (
                            <a
                                href={university.website}
                                target="_blank"
                                rel="noreferrer"
                                className={buttonVariants({ variant: "outline" })}
                            >
                                <ExternalLink className="size-4" />
                                Visit site
                            </a>
                        ) : null}
                    </>
                }
            />

            <div className="grid gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <UniversityEditForm university={university} />
                </div>

                <div className="space-y-5">
                    <Card>
                        <CardHeader>
                            <CardTitle>Publishing</CardTitle>
                            <CardDescription>
                                Status is derived from the public API (admin schemas omit it).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                                <div>
                                    <p className="text-sm font-medium">Current status</p>
                                    <p className="text-xs text-muted-foreground">
                                        {status === "PUBLISHED"
                                            ? "Served to students by MES"
                                            : "Hidden from public apps"}
                                    </p>
                                </div>
                                <StatusBadge status={status} />
                            </div>
                            <PublishToggle id={university.id} status={status} />
                        </CardContent>
                    </Card>

                    <Card className="border-destructive/40">
                        <CardHeader>
                            <CardTitle className="text-destructive">Danger zone</CardTitle>
                            <CardDescription>Irreversible actions. Deleting cascades to all programs.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DeleteUniversity id={university.id} name={university.name_en} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* <Card>
                <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                    <Newspaper className="size-4 text-primary" />
                    <div>
                        <CardTitle>Programs</CardTitle>
                        <CardDescription>Degree programs offered by this university.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <ProgramManager universityId={university.id} programs={university.programs} />
                </CardContent>
            </Card> */}

            {!university.parent_id ? (
                <CampusManager
                    universityId={university.id}
                    universityName={university.name_en}
                    universityType={university.type}
                    abbreviation={university.abbreviation}
                    campuses={university.campuses ?? []}
                />
            ) : null}

            <Card>
                <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                    <Folder className="size-4 text-primary" />
                    <div>
                        <CardTitle>Units</CardTitle>
                        <CardDescription>
                            Faculties, departments, and organizational units offered at this location.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <UnitManager universityId={university.id} units={units} />
                </CardContent>
            </Card>
        </div>
    );
}
