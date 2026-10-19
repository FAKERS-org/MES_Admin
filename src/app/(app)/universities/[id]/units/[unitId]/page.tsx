import { ArrowLeft, Award, BookOpen, FlaskConical } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/feedback";
import ContentManager from "@/components/units/content-manager";
import UnitEditForm from "@/components/units/unit-edit-form";
import { ApiError, apiList, apiRequest } from "@/lib/server-api";
import type {
    CurriculumSection,
    Facility,
    UnitDetail,
    UnitScholarship,
    UnitSummary,
} from "@/lib/types";

export const metadata = { title: "Unit" };
export const dynamic = "force-dynamic";

/**
 * One line telling the admin why a collection looks empty: the public page
 * shows the *effective* rows, which may be inherited from a parent unit.
 */
function inheritedNotice(own: number, effective: number, singular: string, plural: string) {
    if (effective === 0) return undefined;
    const inherited = effective - own;
    if (own === 0) {
        return `This unit has no own ${plural} yet - the public page currently shows ${effective} inherited from a parent unit.`;
    }
    if (inherited > 0) {
        return `The public page shows ${effective} ${plural}: ${own} owned by this unit, ${inherited} inherited from a parent unit.`;
    }
    return undefined;
}

/** Result of fetching one content collection independently, without throwing. */
type ContentResult<T> = { items: T[]; error: string | null };

/** Fetch one content collection; a bad endpoint yields an empty array + error instead of crashing the page. */
async function fetchContent<T>(path: string): Promise<ContentResult<T>> {
    try {
        const items = await apiRequest<T[]>(path);
        return { items, error: null };
    } catch (caught) {
        const message = caught instanceof ApiError ? caught.message : "Failed to load.";
        return { items: [], error: message };
    }
}

export default async function UnitDetailPage({
    params,
}: {
    params: Promise<{ id: string; unitId: string }>;
}) {
    const { id, unitId } = await params;

    let unit: UnitDetail;
    try {
        unit = await apiRequest<UnitDetail>(`admin/universities/${id}/units/${unitId}`);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) notFound();
        throw error;
    }

    // Siblings feed the parent dropdown in the edit form.
    const siblings = await apiList<UnitSummary>(`admin/universities/${id}/units/`);

    // Each content collection is fetched independently. fetchContent swallows
    // failures and returns an empty array plus an error, so one broken endpoint
    // renders an error alert on its card instead of a full-page crash.
    const [facilitiesRes, scholarshipsRes, sectionsRes] = await Promise.all([
        fetchContent<Facility>(`admin/units/${unitId}/facilities/`),
        fetchContent<UnitScholarship>(`admin/units/${unitId}/scholarships/`),
        fetchContent<CurriculumSection>(`admin/units/${unitId}/curriculum-sections/`),
    ]);

    return (
        <div className="space-y-5">
            <PageHeader
                title={
                    <h1 className="text-2xl font-semibold tracking-tight">{unit.name_en}</h1>
                }
                subtitle={
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>{unit.kind.replace(/_/g, " ")}</span>
                        {unit.name_kh ? <span>{unit.name_kh}</span> : null}
                        {unit.category_en ? <span>· {unit.category_en}</span> : null}
                    </span>
                }
                actions={
                    <Link href={`/universities/${id}`} className={buttonVariants({ variant: "ghost" })}>
                        <ArrowLeft className="size-4" />
                        Back to university
                    </Link>
                }
            />

            <div className="grid gap-5 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <UnitEditForm
                        universityId={id}
                        unitId={unitId}
                        unit={unit}
                        siblings={siblings}
                    />
                </div>

                <div className="space-y-5 lg:col-span-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                            <BookOpen className="size-4 text-primary" />
                            <div>
                                <CardTitle>Curriculum sections</CardTitle>
                                <CardDescription>Year-by-year structure with course blocks.</CardDescription>
                            </div>
                        </CardHeader>
                        {sectionsRes.error && <Alert className="mt-3">{sectionsRes.error}</Alert>}
                        <CardContent>
                            <ContentManager<CurriculumSection>
                                unitId={unitId}
                                collection="curriculum-sections"
                                title="Sections"
                                icon={<BookOpen className="size-4 text-primary" />}
                                items={sectionsRes.items}
                                noun="section"
                                emptyTitle="No curriculum sections yet"
                                emptyDescription="Add year or semester sections with their course blocks."
                                notice={inheritedNotice(
                                    sectionsRes.items.length,
                                    unit.curriculum_sections.length,
                                    "section",
                                    "curriculum sections",
                                )}
                                fields={[
                                    {
                                        name: "heading_en",
                                        label: "Heading (English)",
                                        required: true,
                                        placeholder: "Year 1",
                                    },
                                    {
                                        name: "heading_kh",
                                        label: "Heading (Khmer)",
                                        required: true,
                                        placeholder: "ឆ្នាំទី១",
                                    },
                                    { name: "banner_text", label: "Banner text", placeholder: "Foundation year" },
                                    {
                                        name: "blocks",
                                        label: "Blocks (JSON)",
                                        kind: "json",
                                        required: true,
                                        placeholder:
                                            '[{"badge_text":"CS101","title":"Intro to CS","credits":"3","description":"...","courses":["CS101"]}]',
                                        hint: (
                                            <>
                                                Each block: <code>badge_text</code>, <code>title</code>,{" "}
                                                <code>credits</code>, <code>description</code>,{" "}
                                                <code>courses</code> (optional <code>badge_background</code>,{" "}
                                                <code>english_title</code>, <code>special_badge</code>).
                                            </>
                                        ),
                                    },
                                    { name: "position", label: "Position", kind: "number" },
                                ]}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                            <FlaskConical className="size-4 text-primary" />
                            <div>
                                <CardTitle>Facilities</CardTitle>
                                <CardDescription>Labs, centres and workshops.</CardDescription>
                            </div>
                        </CardHeader>
                        {facilitiesRes.error && <Alert className="mt-3">{facilitiesRes.error}</Alert>}
                        <CardContent>
                            <ContentManager<Facility>
                                unitId={unitId}
                                collection="facilities"
                                title="Facilities"
                                icon={<FlaskConical className="size-4 text-primary" />}
                                items={facilitiesRes.items}
                                noun="facility"
                                emptyTitle="No facilities yet"
                                emptyDescription="Add the labs and centres this unit offers."
                                notice={inheritedNotice(
                                    facilitiesRes.items.length,
                                    unit.facilities.length,
                                    "facility",
                                    "facilities",
                                )}
                                fields={[
                                    {
                                        name: "title",
                                        label: "Title",
                                        required: true,
                                        placeholder: "Robotics Lab",
                                    },
                                    { name: "subtitle", label: "Subtitle", placeholder: "Faculty of Engineering" },
                                    {
                                        name: "image",
                                        label: "Image URL",
                                        required: true,
                                        placeholder: "https://example.edu.kh/lab.png",
                                    },
                                    { name: "description", label: "Description", kind: "textarea", required: true },
                                    { name: "position", label: "Position", kind: "number" },
                                ]}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                            <Award className="size-4 text-primary" />
                            <div>
                                <CardTitle>Scholarships</CardTitle>
                                <CardDescription>Awards open to students of this unit.</CardDescription>
                            </div>
                        </CardHeader>
                        {scholarshipsRes.error && <Alert className="mt-3">{scholarshipsRes.error}</Alert>}
                        <CardContent>
                            <ContentManager<UnitScholarship>
                                unitId={unitId}
                                collection="scholarships"
                                title="Scholarships"
                                icon={<Award className="size-4 text-primary" />}
                                items={scholarshipsRes.items}
                                noun="scholarship"
                                emptyTitle="No scholarships yet"
                                emptyDescription="Add scholarships specific to this unit."
                                notice={inheritedNotice(
                                    scholarshipsRes.items.length,
                                    unit.scholarships.length,
                                    "scholarship",
                                    "scholarships",
                                )}
                                fields={[
                                    { name: "name_en", label: "Name (English)", required: true },
                                    { name: "name_kh", label: "Name (Khmer)" },
                                    {
                                        name: "coverage_en",
                                        label: "Coverage (English)",
                                        required: true,
                                        placeholder: "Full tuition",
                                    },
                                    { name: "coverage_kh", label: "Coverage (Khmer)" },
                                    {
                                        name: "requirements",
                                        label: "Requirements (JSON)",
                                        kind: "json",
                                        placeholder: '[{"en":"GPA 3.0+","kh":"..."}]',
                                        hint: (
                                            <>
                                                Each requirement: <code>{"{ \"en\": \"...\", \"kh\": \"...\" }"}</code>
                                            </>
                                        ),
                                    },
                                    { name: "position", label: "Position", kind: "number" },
                                ]}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
