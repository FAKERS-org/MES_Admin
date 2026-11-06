"use client";

import {
    Check,
    CircleDollarSign,
    FileText,
    GraduationCap,
    Landmark,
    RotateCcw,
    Save,
    Sofa,
    Sparkles,
    UserCheck,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { ImageUploader } from "../admin/image-uploader";

function raw(form: FormData, key: string): string {
    return String(form.get(key) ?? "").trim();
}

function nullable(form: FormData, key: string): string | null {
    return raw(form, key) || null;
}

export default function UniversityEditForm({ university }: { university: UniversityDetail }) {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [pending, startTransition] = useTransition();

    const [logoUrl, setLogoUrl] = useState(university.logo_url ?? "");
    const [coverImageUrl, setCoverImageUrl] = useState(university.cover_image_url ?? "");
    const [advisorAvatarUrl, setAdvisorAvatarUrl] = useState(university.advisor_avatar_url ?? "");

    const initialValues = useMemo<Record<string, unknown>>(
        () => ({
            name_en: university.name_en ?? "",
            name_kh: university.name_kh ?? "",
            abbreviation: university.abbreviation ?? "",
            type: university.type ?? "PUBLIC",
            ministry: university.ministry ?? "MOEYS",
            campus_name: university.campus_name ?? "",
            is_main_campus: Boolean(university.is_main_campus),
            province: university.province ?? "",
            address: university.address ?? "",
            website: university.website ?? "",
            contact_phone: university.contact_phone ?? "",
            contact_email: university.contact_email ?? "",
            contact_telegram: university.contact_telegram ?? "",
            established_year: university.established_year != null ? String(university.established_year) : "",
            overview_en: university.overview_en ?? "",
            overview_kh: university.overview_kh ?? "",
            moeys_accredited: Boolean(university.moeys_accredited),
            default_tuition_per_year:
                university.default_tuition_per_year != null
                    ? String(university.default_tuition_per_year)
                    : "",
            default_tuition_female_per_year:
                university.default_tuition_female_per_year != null
                    ? String(university.default_tuition_female_per_year)
                    : "",
            has_scholarships: Boolean(university.has_scholarships),
            scholarship_info: university.scholarship_info ?? "",
            has_dormitory: Boolean(university.has_dormitory),
            dormitory_details: university.dormitory_details ?? "",
            advisor_name: university.advisor_name ?? "",
            advisor_role: university.advisor_role ?? "",
            admissions_requirements_en: university.admissions_requirements_en ?? "",
            admissions_requirements_kh: university.admissions_requirements_kh ?? "",
        }),
        [university]
    );

    const [dirtyFields, setDirtyFields] = useState<Record<string, boolean>>({});

    const isLogoDirty = logoUrl !== (university.logo_url ?? "");
    const isCoverDirty = coverImageUrl !== (university.cover_image_url ?? "");
    const isAdvisorAvatarDirty = advisorAvatarUrl !== (university.advisor_avatar_url ?? "");

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

    function isFieldDirty(name: string): boolean {
        if (name === "logo_url") return isLogoDirty;
        if (name === "cover_image_url") return isCoverDirty;
        if (name === "advisor_avatar_url") return isAdvisorAvatarDirty;
        return Boolean(dirtyFields[name]);
    }

    const dirtyCount = useMemo(() => {
        let count = Object.values(dirtyFields).filter(Boolean).length;
        if (isLogoDirty) count++;
        if (isCoverDirty) count++;
        if (isAdvisorAvatarDirty) count++;
        return count;
    }, [dirtyFields, isLogoDirty, isCoverDirty, isAdvisorAvatarDirty]);

    const isDirty = dirtyCount > 0;

    useEffect(() => {
        setBreadcrumbLabel(`/universities/${university.id}`, university.name_en);
    }, [university.id, university.name_en]);

    // Warn before navigating away with unsaved changes
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

    // Cmd+S / Ctrl+S shortcut to save
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
        setLogoUrl(university.logo_url ?? "");
        setCoverImageUrl(university.cover_image_url ?? "");
        setAdvisorAvatarUrl(university.advisor_avatar_url ?? "");
        setDirtyFields({});
        setError(null);
    }

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
            default_tuition_female_per_year: defaultTuitionFemaleRaw
                ? Number(defaultTuitionFemaleRaw)
                : null,
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
                setDirtyFields({});
                router.refresh();
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Could not save the university.");
            }
        });
    }

    return (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            onInput={e => checkFieldDirty(e.target as any)}
            onChange={e => checkFieldDirty(e.target as any)}
            className="relative"
        >
            <Card className="overflow-visible">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Landmark className="size-4 text-primary" />
                            <CardTitle>Institution profile</CardTitle>
                            {isDirty ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/25 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 animate-in fade-in zoom-in-95">
                                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    {dirtyCount} unsaved
                                </span>
                            ) : null}
                        </div>
                        <CardDescription>
                            Saved with one <code className="rounded bg-muted px-1">PATCH</code> to the admin API.
                        </CardDescription>
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
                            {pending ? "Saving…" : isDirty ? "Save changes" : "All saved"}
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    {error ? <Alert>{error}</Alert> : null}
                    {saved && !error ? (
                        <Alert variant="success">
                            <span className="inline-flex items-center gap-1.5">
                                <Check className="size-3.5" /> Changes saved successfully.
                            </span>
                        </Alert>
                    ) : null}

                    <section className="space-y-4">
                        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Identity</h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                label="Name (English)"
                                htmlFor="name_en"
                                required
                                dirty={isFieldDirty("name_en")}
                            >
                                <Input
                                    id="name_en"
                                    name="name_en"
                                    defaultValue={university.name_en}
                                    required
                                    dirty={isFieldDirty("name_en")}
                                />
                            </Field>
                            <Field
                                label="Name (Khmer)"
                                htmlFor="name_kh"
                                dirty={isFieldDirty("name_kh")}
                            >
                                <Input
                                    id="name_kh"
                                    name="name_kh"
                                    defaultValue={university.name_kh ?? ""}
                                    dirty={isFieldDirty("name_kh")}
                                />
                            </Field>
                            <Field
                                label="Abbreviation"
                                htmlFor="abbreviation"
                                dirty={isFieldDirty("abbreviation")}
                            >
                                <Input
                                    id="abbreviation"
                                    name="abbreviation"
                                    defaultValue={university.abbreviation ?? ""}
                                    dirty={isFieldDirty("abbreviation")}
                                />
                            </Field>
                            <Field
                                label="Type"
                                htmlFor="type"
                                required
                                dirty={isFieldDirty("type")}
                            >
                                <Select
                                    id="type"
                                    name="type"
                                    defaultValue={university.type}
                                    dirty={isFieldDirty("type")}
                                >
                                    <option value="PUBLIC">Public</option>
                                    <option value="PRIVATE">Private</option>
                                </Select>
                            </Field>
                            <Field
                                label="Supervising Ministry"
                                htmlFor="ministry"
                                required
                                dirty={isFieldDirty("ministry")}
                            >
                                <Select
                                    id="ministry"
                                    name="ministry"
                                    defaultValue={university.ministry ?? "MOEYS"}
                                    dirty={isFieldDirty("ministry")}
                                >
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
                            <Field
                                label="Campus Name"
                                htmlFor="campus_name"
                                dirty={isFieldDirty("campus_name")}
                            >
                                <Input
                                    id="campus_name"
                                    name="campus_name"
                                    defaultValue={university.campus_name ?? ""}
                                    placeholder="e.g. Main Campus, Toul Kork, Battambang..."
                                    dirty={isFieldDirty("campus_name")}
                                />
                            </Field>
                            <Checkbox
                                id="is_main_campus"
                                name="is_main_campus"
                                label="Is main campus"
                                defaultChecked={Boolean(university.is_main_campus)}
                                dirty={isFieldDirty("is_main_campus")}
                            />
                            <Field
                                label="Province"
                                htmlFor="province"
                                required
                                className="sm:col-span-2"
                                dirty={isFieldDirty("province")}
                            >
                                <>
                                    <Input
                                        id="province"
                                        name="province"
                                        list="provinces"
                                        defaultValue={university.province}
                                        required
                                        dirty={isFieldDirty("province")}
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
                            <Field
                                label="Address"
                                htmlFor="address"
                                dirty={isFieldDirty("address")}
                            >
                                <Input
                                    id="address"
                                    name="address"
                                    defaultValue={university.address ?? ""}
                                    dirty={isFieldDirty("address")}
                                />
                            </Field>
                            <Field
                                label="Website"
                                htmlFor="website"
                                dirty={isFieldDirty("website")}
                            >
                                <Input
                                    id="website"
                                    name="website"
                                    placeholder="https://example.edu.kh"
                                    defaultValue={university.website ?? ""}
                                    dirty={isFieldDirty("website")}
                                />
                            </Field>
                            <Field
                                label="Contact Phone / Hotline"
                                htmlFor="contact_phone"
                                dirty={isFieldDirty("contact_phone")}
                            >
                                <Input
                                    id="contact_phone"
                                    name="contact_phone"
                                    placeholder="023 880 370"
                                    defaultValue={university.contact_phone ?? ""}
                                    dirty={isFieldDirty("contact_phone")}
                                />
                            </Field>
                            <Field
                                label="Contact Email"
                                htmlFor="contact_email"
                                dirty={isFieldDirty("contact_email")}
                            >
                                <Input
                                    id="contact_email"
                                    name="contact_email"
                                    type="email"
                                    placeholder="info@itc.edu.kh"
                                    defaultValue={university.contact_email ?? ""}
                                    dirty={isFieldDirty("contact_email")}
                                />
                            </Field>
                            <Field
                                label="Contact Telegram (User / Link)"
                                htmlFor="contact_telegram"
                                dirty={isFieldDirty("contact_telegram")}
                            >
                                <Input
                                    id="contact_telegram"
                                    name="contact_telegram"
                                    placeholder="itc_admissions or https://t.me/itc_admissions"
                                    defaultValue={university.contact_telegram ?? ""}
                                    dirty={isFieldDirty("contact_telegram")}
                                />
                            </Field>
                            <Field
                                label="Established year"
                                htmlFor="established_year"
                                dirty={isFieldDirty("established_year")}
                            >
                                <Input
                                    id="established_year"
                                    name="established_year"
                                    inputMode="numeric"
                                    placeholder="e.g. 1960"
                                    defaultValue={university.established_year ? String(university.established_year) : ""}
                                    dirty={isFieldDirty("established_year")}
                                />
                            </Field>
                            <Field
                                label="Logo URL"
                                htmlFor="logo_url"
                                dirty={isFieldDirty("logo_url")}
                            >
                                <input type="hidden" name="logo_url" value={logoUrl} />
                                <ImageUploader
                                    value={logoUrl}
                                    onChange={setLogoUrl}
                                    abbreviation={university.abbreviation || "uni"}
                                    purpose="logo"
                                />
                                <Input
                                    placeholder="or paste image URL"
                                    value={logoUrl}
                                    onChange={e => setLogoUrl(e.target.value)}
                                    className="mt-2"
                                    dirty={isFieldDirty("logo_url")}
                                />
                            </Field>
                            <Field
                                label="Cover image URL"
                                htmlFor="cover_image_url"
                                dirty={isFieldDirty("cover_image_url")}
                            >
                                <input type="hidden" name="cover_image_url" value={coverImageUrl} />
                                <ImageUploader
                                    value={coverImageUrl}
                                    onChange={setCoverImageUrl}
                                    abbreviation={university.abbreviation || "uni"}
                                    purpose="cover"
                                />
                                <Input
                                    placeholder="or paste image URL"
                                    value={coverImageUrl}
                                    onChange={e => setCoverImageUrl(e.target.value)}
                                    className="mt-2"
                                    dirty={isFieldDirty("cover_image_url")}
                                />
                            </Field>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <GraduationCap className="size-3.5" /> Academic details
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                label="Overview (English)"
                                htmlFor="overview_en"
                                className="sm:col-span-2"
                                dirty={isFieldDirty("overview_en")}
                            >
                                <Textarea
                                    id="overview_en"
                                    name="overview_en"
                                    rows={4}
                                    placeholder="A short description of the university, history, or vision."
                                    defaultValue={university.overview_en ?? ""}
                                    dirty={isFieldDirty("overview_en")}
                                />
                            </Field>
                            <Field
                                label="Overview (Khmer)"
                                htmlFor="overview_kh"
                                className="sm:col-span-2"
                                dirty={isFieldDirty("overview_kh")}
                            >
                                <Textarea
                                    id="overview_kh"
                                    name="overview_kh"
                                    rows={4}
                                    placeholder="ការពិពណ៌នាសង្ខេបអំពីសាកលវិទ្យាល័យ ប្រវត្តិ ឬចក្ខុវិស័យជាភាសាខ្មែរ..."
                                    defaultValue={university.overview_kh ?? ""}
                                    dirty={isFieldDirty("overview_kh")}
                                />
                            </Field>
                            <Checkbox
                                id="moeys_accredited"
                                name="moeys_accredited"
                                label="Accredited by MoEYS"
                                description="Shows the verified badge across the public directory."
                                defaultChecked={Boolean(university.moeys_accredited)}
                                dirty={isFieldDirty("moeys_accredited")}
                            />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <CircleDollarSign className="size-3.5" /> Tuition & fees
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                label="Default Tuition per Year (USD)"
                                htmlFor="default_tuition_per_year"
                                hint="Baseline tuition if faculties or programs do not specify their own."
                                dirty={isFieldDirty("default_tuition_per_year")}
                            >
                                <Input
                                    id="default_tuition_per_year"
                                    name="default_tuition_per_year"
                                    inputMode="numeric"
                                    placeholder="e.g. 600"
                                    defaultValue={
                                        university.default_tuition_per_year != null
                                            ? String(university.default_tuition_per_year)
                                            : ""
                                    }
                                    dirty={isFieldDirty("default_tuition_per_year")}
                                />
                            </Field>
                            <Field
                                label="Default Tuition for Females per Year (USD)"
                                htmlFor="default_tuition_female_per_year"
                                hint="Incentive discount for female students in STEM programs."
                                dirty={isFieldDirty("default_tuition_female_per_year")}
                            >
                                <Input
                                    id="default_tuition_female_per_year"
                                    name="default_tuition_female_per_year"
                                    inputMode="numeric"
                                    placeholder="e.g. 450"
                                    defaultValue={
                                        university.default_tuition_female_per_year != null
                                            ? String(university.default_tuition_female_per_year)
                                            : ""
                                    }
                                    dirty={isFieldDirty("default_tuition_female_per_year")}
                                />
                            </Field>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <Sofa className="size-3.5" /> Scholarships & housing
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Checkbox
                                id="has_scholarships"
                                name="has_scholarships"
                                label="Has scholarships available"
                                description="Marks the university as scholarship-eligible in search and profile."
                                defaultChecked={Boolean(university.has_scholarships)}
                                dirty={isFieldDirty("has_scholarships")}
                            />
                            <Field
                                label="Scholarship Details / Criteria"
                                htmlFor="scholarship_info"
                                hint="Eligibility, coverage (50%, 100%), partner sponsors, or exam requirements."
                                dirty={isFieldDirty("scholarship_info")}
                            >
                                <Textarea
                                    id="scholarship_info"
                                    name="scholarship_info"
                                    rows={3}
                                    placeholder="e.g. 100% government scholarships available for top BacII scores. Need-based aid available."
                                    defaultValue={university.scholarship_info ?? ""}
                                    dirty={isFieldDirty("scholarship_info")}
                                />
                            </Field>
                            <Checkbox
                                id="has_dormitory"
                                name="has_dormitory"
                                label="Has dormitory / student housing"
                                description="Indicates on-campus or affiliated student accommodations are provided."
                                defaultChecked={Boolean(university.has_dormitory)}
                                dirty={isFieldDirty("has_dormitory")}
                            />
                            <Field
                                label="Dormitory Details / Capacity"
                                htmlFor="dormitory_details"
                                hint="Room types, cost per semester, gender-specific housing info, or reservation steps."
                                dirty={isFieldDirty("dormitory_details")}
                            >
                                <Textarea
                                    id="dormitory_details"
                                    name="dormitory_details"
                                    rows={3}
                                    placeholder="e.g. 4-person shared rooms available for female students from rural provinces. $30/month."
                                    defaultValue={university.dormitory_details ?? ""}
                                    dirty={isFieldDirty("dormitory_details")}
                                />
                            </Field>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <UserCheck className="size-3.5" /> Academic advisor
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Featured contact person displayed on the university detail page in MES.
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                label="Advisor Name"
                                htmlFor="advisor_name"
                                dirty={isFieldDirty("advisor_name")}
                            >
                                <Input
                                    id="advisor_name"
                                    name="advisor_name"
                                    placeholder="Dr. Sok Chan"
                                    defaultValue={university.advisor_name ?? ""}
                                    dirty={isFieldDirty("advisor_name")}
                                />
                            </Field>
                            <Field
                                label="Advisor Role / Title"
                                htmlFor="advisor_role"
                                dirty={isFieldDirty("advisor_role")}
                            >
                                <Input
                                    id="advisor_role"
                                    name="advisor_role"
                                    placeholder="Head of Admissions"
                                    defaultValue={university.advisor_role ?? ""}
                                    dirty={isFieldDirty("advisor_role")}
                                />
                            </Field>
                            <Field
                                label="Advisor Avatar"
                                htmlFor="advisor_avatar_url"
                                className="sm:col-span-2"
                                dirty={isFieldDirty("advisor_avatar_url")}
                            >
                                <input type="hidden" name="advisor_avatar_url" value={advisorAvatarUrl} />
                                <ImageUploader
                                    value={advisorAvatarUrl}
                                    onChange={setAdvisorAvatarUrl}
                                    abbreviation={university.abbreviation || "uni"}
                                    purpose="avatar"
                                />
                                <Input
                                    placeholder="or paste image URL"
                                    value={advisorAvatarUrl}
                                    onChange={e => setAdvisorAvatarUrl(e.target.value)}
                                    className="mt-2"
                                    dirty={isFieldDirty("advisor_avatar_url")}
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
                            <Field
                                label="Requirements (English)"
                                htmlFor="admissions_requirements_en"
                                dirty={isFieldDirty("admissions_requirements_en")}
                            >
                                <Textarea
                                    id="admissions_requirements_en"
                                    name="admissions_requirements_en"
                                    rows={3}
                                    placeholder="e.g. High School Diploma (BacII) Grade A-E or passing the national entrance examination."
                                    defaultValue={university.admissions_requirements_en ?? ""}
                                    dirty={isFieldDirty("admissions_requirements_en")}
                                />
                            </Field>
                            <Field
                                label="Requirements (Khmer)"
                                htmlFor="admissions_requirements_kh"
                                dirty={isFieldDirty("admissions_requirements_kh")}
                            >
                                <Textarea
                                    id="admissions_requirements_kh"
                                    name="admissions_requirements_kh"
                                    rows={3}
                                    placeholder="ឧទាហរណ៍៖ សញ្ញាបត្រមធ្យមសិក្សាទុតិយភូមិ (បាក់ឌុប) និទ្ទេស A-E ឬប្រឡងជាប់ការប្រឡងជ្រើសរើសថ្នាក់ជាតិ..."
                                    defaultValue={university.admissions_requirements_kh ?? ""}
                                    dirty={isFieldDirty("admissions_requirements_kh")}
                                />
                            </Field>
                        </div>
                    </section>

                    {/* Bottom action row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {isDirty ? (
                                <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    {dirtyCount} unsaved {dirtyCount === 1 ? "change" : "changes"} (press <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">Ctrl+S</kbd> to save)
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                    <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                    All changes saved via the API.
                                </span>
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
                                    <RotateCcw className="size-3.5 mr-1" />
                                    Discard
                                </Button>
                            ) : null}
                            <Button type="submit" disabled={pending || !isDirty} size="sm">
                                {pending ? <Spinner className="size-4" /> : <Save className="size-4" />}
                                {pending ? "Saving…" : isDirty ? "Save changes" : "Saved"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sticky Floating Save Dock when there are unsaved changes */}
            {isDirty ? (
                <div className="sticky bottom-6 z-40 mt-6 flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-card/95 px-4 py-3 shadow-xl backdrop-blur-md dark:bg-card/90 animate-in fade-in slide-in-from-bottom-3 duration-200">
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
                                Click save or press <kbd className="rounded border bg-muted px-1 py-0.2 font-mono text-[10px]">Ctrl+S</kbd> to commit edits.
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
                            {pending ? "Saving…" : "Save changes"}
                        </Button>
                    </div>
                </div>
            ) : null}
        </form>
    );
}
