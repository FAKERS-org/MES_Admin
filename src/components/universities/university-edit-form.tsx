"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Check, GraduationCap, Landmark, Save, Sofa } from "lucide-react";

import { apiRequest } from "@/lib/api";
import {
  PROVINCES,
  type UniversityDetail,
  type UniversityUpdatePayload,
  type UniversityType,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";

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

    const payload: UniversityUpdatePayload = {
      name_en: nameEn,
      name_kh: nullable(form, "name_kh"),
      abbreviation: nullable(form, "abbreviation"),
      type: form.get("type") as UniversityType,
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
    };

    startTransition(async () => {
      try {
        await apiRequest(`/api/admin/universities/${university.id}`, {
          method: "PATCH",
          body: payload,
        });
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
                <Input id="abbreviation" name="abbreviation" defaultValue={university.abbreviation ?? ""} />
              </Field>
              <Field label="Type" htmlFor="type" required>
                <Select id="type" name="type" defaultValue={university.type}>
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                </Select>
              </Field>
              <Field label="Province" htmlFor="province" required className="sm:col-span-2">
                <>
                  <Input id="province" name="province" list="provinces" defaultValue={university.province} required />
                  <datalist id="provinces">
                    {PROVINCES.map((province) => (
                      <option key={province} value={province} />
                    ))}
                  </datalist>
                </>
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Contact & media</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address" htmlFor="address">
                <Input id="address" name="address" defaultValue={university.address ?? ""} />
              </Field>
              <Field label="Website" htmlFor="website">
                <Input id="website" name="website" placeholder="https://example.edu.kh" defaultValue={university.website ?? ""} />
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
              <div className="grid grid-cols-2 gap-4">
                <Field label="Logo URL" htmlFor="logo_url">
                  <Input id="logo_url" name="logo_url" defaultValue={university.logo_url ?? ""} />
                </Field>
                <Field label="Cover URL" htmlFor="cover_image_url">
                  <Input id="cover_image_url" name="cover_image_url" defaultValue={university.cover_image_url ?? ""} />
                </Field>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overview</h4>
            <Field label="Overview (English)" htmlFor="overview_en">
              <Textarea id="overview_en" name="overview_en" rows={4} defaultValue={university.overview_en ?? ""} />
            </Field>
            <Field label="Overview (Khmer)" htmlFor="overview_kh">
              <Textarea id="overview_kh" name="overview_kh" rows={4} defaultValue={university.overview_kh ?? ""} />
            </Field>
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
                  description={<span className="inline-flex items-center gap-1"><Sofa className="size-3" /> Student housing on or near campus.</span>}
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
