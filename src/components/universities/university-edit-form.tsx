"use client";

import { Check, CircleDollarSign, FileText, GraduationCap, Landmark, Save, Sofa, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import { setBreadcrumbLabel } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { apiRequest } from "@/lib/api";
import {
    MINISTRIES,
    MINISTRY_LABELS,
    PROVINCES,
    type Ministry,
    type UniversityDetail,
    type UniversityType,
    type UniversityUpdatePayload,
} from "@/lib/types";
import { ImageUploader } from "../admin/image-uploader";

function raw(form: FormData, key: string): string {
    return String(form.get(key) ?? "").trim();
}

function nullable(form: FormData, key: string): string | null {
    return raw(form, key) || null;
}

export default function UniversityEditForm({ university }: { university: UniversityDetail }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [pending, startTransition] = useTransition();
    const [logoUrl, setLogoUrl] = useState(university.logo_url ?? "");
    const [coverImageUrl, setCoverImageUrl] = useState(university.cover_image_url ?? "");
    const [advisorAvatarUrl, setAdvisorAvatarUrl] = useState(university.advisor_avatar_url ?? "");

    useEffect(() => {
        setBreadcrumbLabel(`/universities/${university.id}`, university.name_en);
    }, [university.id, university.name_en]);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSaved(false);

        const form = new FormData(event.currentTarget);
        const nameEn = raw(form, "name_en");
        const province = raw(form, "province");
        const yearRaw = raw(form, "established_year");

        if (!nameEn || !province) {
            setError("Name (English) and province are required.");
            return;
        }
        if (yearRaw && (!/^\d{4}$/.test(yearRaw) || Number(yearRaw) < 1000)) {
            setError("Established year must be a 4-digit year, e.g. 1960.");
            return;
        }

        const defaultTuitionRaw = raw(form, "default_tuition_per_year");
        const defaultTuitionFemaleRaw = raw(form, "default_tuition_female_per_year");

        const payload: UniversityUpdatePayload = {
            name_en: nameEn,
            name_kh: nullable(form, "name_kh"),
            abbreviation: nullable(form, "abbreviation"),
            type: form.get("type") as UniversityType,
            ministry: (form.get("ministry") as Ministry) || undefined,
            province,
            address: nullable(form, "address"),
            website: nullable(form, "website"),
            logo_url: nullable(form, "logo_url"),
            cover_image_url: nullable(form, "cover_image_url"),
            overview_en: nullable(form, "overview_en"),
            overview_kh: nullable(form, "overview_kh"),
            established_year: yearRaw ? Number(yearRaw) : null,
            moeys_accredited: form.get("moeys_accredited") === "on",
            has_scholarships: form.get("has_scholarships") === "on",
            scholarship_info: nullable(form, "scholarship_info"),
            has_dormitory: form.get("has_dormitory") === "on",
            dormitory_details: nullable(form, "dormitory_details"),
            contact_phone: nullable(form, "contact_phone"),
            contact_email: nullable(form, "contact_email"),
            contact_telegram: nullable(form, "contact_telegram"),
            advisor_name: nullable(form, "advisor_name"),
            advisor_role: nullable(form, "advisor_role"),
            advisor_avatar_url: nullable(form, "advisor_avatar_url"),
            admissions_requirements_en: nullable(form, "admissions_requirements_en"),
            admissions_requirements_kh: nullable(form, "admissions_requirements_kh"),
            default_tuition_per_year: defaultTuitionRaw ? Number(defaultTuitionRaw) : null,
            default_tuition_female_per_year: defaultTuitionFemaleRaw ? Number(defaultTuitionFemaleRaw) : null,
            campus_name: nullable(form, "campus_name"),
            is_main_campus: form.get("is_main_campus") === "on",
        };

        startTransition(async () => {
            try {
                await apiRequest(`/api/admin/universities/${university.id}`, {
                    method: "PATCH",
                    body: payload,
                });
                setBreadcrumbLabel(`/universities/${university.id}`, payload.name_en ?? university.name_en);
                setSaved(true);
                router.refresh();
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Could not save the university.");
            }
        });
    }

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Landmark className="size-4 text-primary" />
                        <CardTitle>Institution profile</CardTitle>
                    </div>
                    <CardDescription>
                        Saved with one <code className="rounded bg-muted px-1">PATCH</code> to the admin API.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {error ? <Alert>{error}</Alert> : null}
                    {saved && !error ? (
                        <Alert variant="success">
                            <span className="inline-flex items-center gap-1.5">
                                <Check className="size-3.5" /> Changes saved.
                            </span>
                        </Alert>
                    ) : null}

                    <section className="space-y-4">
                        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Identity</h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Name (English)" htmlFor="name_en" required>
                                <Input id="name_en" name="name_en" defaultValue={university.name_en} required />
                            </Field>
                            <Field label="Name (Khmer)" htmlFor="name_kh">
                                <Input id="name_kh" name="name_kh" defaultValue={university.name_kh ?? ""} />
                            </Field>
                            <Field label="Abbreviation" htmlFor="abbreviation">
                                <Input
                                    id="abbreviation"
                                    name="abbreviation"
                                    defaultValue={university.abbreviation ?? ""}
                                />
                            </Field>
                            <Field label="Type" htmlFor="type" required>
                                <Select id="type" name="type" defaultValue={university.type}>
                                    <option value="PUBLIC">Public</option>
                                    <option value="PRIVATE">Private</option>
                                </Select>
                            </Field>
                            <Field label="Supervising Ministry" htmlFor="ministry" required>
                                <Select id="ministry" name="ministry" defaultValue={university.ministry ?? "MOEYS"}>
                                    {MINISTRIES.map(m => {
                                        const label = MINISTRY_LABELS[m];
                                        return (
                                            <option key={m} value={m}>
                                                {label.short} — {label.kh} ({label.en})
                                            </option>
                                        );
                                    })}
                                </Select>
                            </Field>
                            <Field label="Campus Name" htmlFor="campus_name">
                                <Input
                                    id="campus_name"
                                    name="campus_name"
                                    defaultValue={university.campus_name ?? ""}
                                    placeholder="e.g. Main Campus, Toul Kork, Battambang..."
                                />
                            </Field>
                            <Checkbox
                                id="is_main_campus"
                                name="is_main_campus"
                                label="Is main campus"
                                defaultChecked={Boolean(university.is_main_campus)}
                            />
                            <Field label="Province" htmlFor="province" required className="sm:col-span-2">
                                <>
                                    <Input
                                        id="province"
                                        name="province"
                                        list="provinces"
                                        defaultValue={university.province}
                                        required
                                    />
                                    <datalist id="provinces">
                                        {PROVINCES.map(province => (
                                            <option key={province} value={province} />
                                        ))}
                                    </datalist>
                                </>
                            </Field>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Contact & media
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Address" htmlFor="address">
                                <Input id="address" name="address" defaultValue={university.address ?? ""} />
                            </Field>
                            <Field label="Website" htmlFor="website">
                                <Input
                                    id="website"
                                    name="website"
                                    placeholder="https://example.edu.kh"
                                    defaultValue={university.website ?? ""}
                                />
                            </Field>
                            <Field label="Contact Phone / Hotline" htmlFor="contact_phone">
                                <Input
                                    id="contact_phone"
                                    name="contact_phone"
                                    placeholder="023 880 370"
                                    defaultValue={university.contact_phone ?? ""}
                                />
                            </Field>
                            <Field label="Contact Email" htmlFor="contact_email">
                                <Input
                                    id="contact_email"
                                    name="contact_email"
                                    type="email"
                                    placeholder="info@itc.edu.kh"
                                    defaultValue={university.contact_email ?? ""}
                                />
                            </Field>
                            <Field label="Contact Telegram (User / Link)" htmlFor="contact_telegram">
                                <Input
                                    id="contact_telegram"
                                    name="contact_telegram"
                                    placeholder="itc_admissions or https://t.me/itc_admissions"
                                    defaultValue={university.contact_telegram ?? ""}
                                />
                            </Field>
                            <Field label="Established year" htmlFor="established_year">
                                <Input
                                    id="established_year"
                                    name="established_year"
                                    inputMode="numeric"
                                    placeholder="1960"
                                    defaultValue={university.established_year ?? ""}
                                />
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2">
                                <Field label="Logo" className="sm:col-span-2">
                                    <input type="hidden" name="logo_url" value={logoUrl} />
                                    <ImageUploader
                                        label="Upload logo"
                                        value={logoUrl}
                                        onChange={setLogoUrl}
                                        abbreviation={university.abbreviation ?? ""}
                                        purpose="logo"
                                    />
                                    <Input
                                        placeholder="or paste logo URL"
                                        value={logoUrl}
                                        onChange={e => setLogoUrl(e.target.value)}
                                        className="mt-2"
                                    />
                                </Field>

                                <Field label="Cover image" className="sm:col-span-2">
                                    <input type="hidden" name="cover_image_url" value={coverImageUrl} />
                                    <ImageUploader
                                        label="Upload cover"
                                        value={coverImageUrl}
                                        onChange={setCoverImageUrl}
                                        abbreviation={university.abbreviation ?? ""}
                                        purpose="cover"
                                    />
                                    <Input
                                        placeholder="or paste cover URL"
                                        value={coverImageUrl}
                                        onChange={e => setCoverImageUrl(e.target.value)}
                                        className="mt-2"
                                    />
                                </Field>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overview</h4>
                        <Field label="Overview (English)" htmlFor="overview_en">
                            <Textarea
                                id="overview_en"
                                name="overview_en"
                                rows={4}
                                defaultValue={university.overview_en ?? ""}
                            />
                        </Field>
                        <Field label="Overview (Khmer)" htmlFor="overview_kh">
                            <Textarea
                                id="overview_kh"
                                name="overview_kh"
                                rows={4}
                                defaultValue={university.overview_kh ?? ""}
                            />
                        </Field>
                    </section>

                    <section className="space-y-4">
                        <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <CircleDollarSign className="size-3.5" /> University tuition defaults
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Set uniform tuition fees for this university. Individual academic programs will inherit these amounts unless explicitly overridden.
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Default Tuition / Year ($ USD)" htmlFor="default_tuition_per_year">
                                <Input
                                    id="default_tuition_per_year"
                                    name="default_tuition_per_year"
                                    type="number"
                                    placeholder="e.g. 800"
                                    defaultValue={university.default_tuition_per_year ?? ""}
                                />
                            </Field>
                            <Field label="Default Female Tuition / Year ($ USD)" htmlFor="default_tuition_female_per_year">
                                <Input
                                    id="default_tuition_female_per_year"
                                    name="default_tuition_female_per_year"
                                    type="number"
                                    placeholder="e.g. 400 (if female incentive applies)"
                                    defaultValue={university.default_tuition_female_per_year ?? ""}
                                />
                            </Field>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <GraduationCap className="size-3.5" /> Recognition & facilities
                        </h4>

                        <Checkbox
                            id="moeys_accredited"
                            name="moeys_accredited"
                            defaultChecked={university.moeys_accredited}
                            label="Accredited by MoEYS"
                            description="Shows the MoEYS badge next to this university."
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-3">
                                <Checkbox
                                    id="has_scholarships"
                                    name="has_scholarships"
                                    defaultChecked={university.has_scholarships}
                                    label="Offers scholarships"
                                />
                                <Field label="Scholarship details" htmlFor="scholarship_info">
                                    <Textarea
                                        id="scholarship_info"
                                        name="scholarship_info"
                                        rows={3}
                                        defaultValue={university.scholarship_info ?? ""}
                                        placeholder="e.g. 50% tuition waiver for top 10% entrance scores"
                                    />
                                </Field>
                            </div>

                            <div className="space-y-3">
                                <Checkbox
                                    id="has_dormitory"
                                    name="has_dormitory"
                                    defaultChecked={university.has_dormitory}
                                    label="Has dormitory"
                                    description={
                                        <span className="inline-flex items-center gap-1">
                                            <Sofa className="size-3" /> Student housing on or near campus.
                                        </span>
                                    }
                                />
                                <Field label="Dormitory details" htmlFor="dormitory_details">
                                    <Textarea
                                        id="dormitory_details"
                                        name="dormitory_details"
                                        rows={3}
                                        defaultValue={university.dormitory_details ?? ""}
                                        placeholder="e.g. Separate male/female blocks, 200 beds"
                                    />
                                </Field>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <UserCheck className="size-3.5" /> Admissions advisor & contact
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Staff profile displayed on university overview, admissions, and student Q&A cards.
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Advisor Name" htmlFor="advisor_name">
                                <Input
                                    id="advisor_name"
                                    name="advisor_name"
                                    placeholder="e.g. លោកគ្រូ វណ្ណារ៉ា (Vannara)"
                                    defaultValue={university.advisor_name ?? ""}
                                />
                            </Field>
                            <Field label="Advisor Role / Title" htmlFor="advisor_role">
                                <Input
                                    id="advisor_role"
                                    name="advisor_role"
                                    placeholder="e.g. Head of Student Admissions"
                                    defaultValue={university.advisor_role ?? ""}
                                />
                            </Field>
                            <Field label="Advisor Avatar Image" className="sm:col-span-2">
                                <input type="hidden" name="advisor_avatar_url" value={advisorAvatarUrl} />
                                <ImageUploader
                                    label="Upload photo"
                                    value={advisorAvatarUrl}
                                    onChange={setAdvisorAvatarUrl}
                                    abbreviation={university.abbreviation ?? ""}
                                    purpose="avatar"
                                />
                                <Input
                                    placeholder="or paste image URL"
                                    value={advisorAvatarUrl}
                                    onChange={e => setAdvisorAvatarUrl(e.target.value)}
                                    className="mt-2"
                                />
                            </Field>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <FileText className="size-3.5" /> Admissions requirements
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Specific entry criteria and requirements displayed on the university admissions page.
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Requirements (English)" htmlFor="admissions_requirements_en">
                                <Textarea
                                    id="admissions_requirements_en"
                                    name="admissions_requirements_en"
                                    rows={3}
                                    placeholder="e.g. High School Diploma (BacII) Grade A-E or passing the national entrance examination."
                                    defaultValue={university.admissions_requirements_en ?? ""}
                                />
                            </Field>
                            <Field label="Requirements (Khmer)" htmlFor="admissions_requirements_kh">
                                <Textarea
                                    id="admissions_requirements_kh"
                                    name="admissions_requirements_kh"
                                    rows={3}
                                    placeholder="ឧទាហរណ៍៖ សញ្ញាបត្រមធ្យមសិក្សាទុតិយភូមិ (បាក់ឌុប) និទ្ទេស A-E ឬប្រឡងជាប់ការប្រឡងជ្រើសរើសថ្នាក់ជាតិ..."
                                    defaultValue={university.admissions_requirements_kh ?? ""}
                                />
                            </Field>
                        </div>
                    </section>

                    <div className="flex items-center gap-2 border-t pt-4">
                        <Button type="submit" disabled={pending}>
                            {pending ? <Spinner className="size-4" /> : <Save className="size-4" />}
                            {pending ? "Saving…" : "Save changes"}
                        </Button>
                        <p className="text-xs text-muted-foreground">Last change is applied immediately via the API.</p>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}
