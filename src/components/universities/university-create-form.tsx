"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { ArrowLeft, Building2 } from "lucide-react";

import Link from "next/link";

import { apiRequest } from "@/lib/api";
import { PROVINCES, type UniversityCreatePayload, type UniversitySummary, type UniversityType } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, PageHeader, Spinner } from "@/components/ui/feedback";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";

export default function UniversityCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const nameEn = String(form.get("name_en") ?? "").trim();
    const province = String(form.get("province") ?? "").trim();

    if (!nameEn || !province) {
      setError("Name (English) and province are required.");
      return;
    }

    const payload: UniversityCreatePayload = {
      name_en: nameEn,
      name_kh: String(form.get("name_kh") ?? "").trim() || null,
      abbreviation: String(form.get("abbreviation") ?? "").trim() || null,
      type: form.get("type") as UniversityType,
      province,
    };

    startTransition(async () => {
      try {
        const created = await apiRequest<UniversitySummary>("/api/admin/universities", {
          method: "POST",
          body: payload,
        });
        router.push(`/universities/${created.id}`);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not create the university.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={<h1 className="text-2xl font-semibold tracking-tight">New university</h1>}
        subtitle="New records are always created as a draft; publish when the profile is complete."
        actions={
          <Link href="/universities" className={buttonVariants({ variant: "ghost" })}>
            <ArrowLeft className="size-4" />
            Back to list
          </Link>
        }
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <CardTitle>Identity</CardTitle>
            </div>
            <CardDescription>Only the four fields marked with * are required by the API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? <Alert>{error}</Alert> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name (English)" htmlFor="name_en" required>
                <Input id="name_en" name="name_en" placeholder="Royal University of Phnom Penh" autoFocus />
              </Field>

              <Field label="Name (Khmer)" htmlFor="name_kh">
                <Input id="name_kh" name="name_kh" placeholder="ឈ្មោះជាភាសាខ្មែរ" />
              </Field>

              <Field label="Abbreviation" htmlFor="abbreviation" hint="Shown in tables and badges.">
                <Input id="abbreviation" name="abbreviation" placeholder="RUPP" />
              </Field>

              <Field label="Type" htmlFor="type" required>
                <Select id="type" name="type" defaultValue="PUBLIC">
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                </Select>
              </Field>

              <Field
                label="Province"
                htmlFor="province"
                required
                hint="Pick a suggestion or type any value."
                className="sm:col-span-2"
              >
                <>
                  <Input id="province" name="province" list="provinces" placeholder="Phnom Penh" />
                  <datalist id="provinces">
                    {PROVINCES.map((province) => (
                      <option key={province} value={province} />
                    ))}
                  </datalist>
                </>
              </Field>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner className="size-4" /> : null}
                {pending ? "Creating…" : "Create university"}
              </Button>
              <Link href="/universities" className={buttonVariants({ variant: "ghost" })}>
                Cancel
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
