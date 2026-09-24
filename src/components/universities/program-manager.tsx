"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Pencil, Plus, Trash2, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import {
  CURRENCIES,
  DEGREE_LEVELS,
  type Currency,
  type DegreeLevel,
  type ProgramCreatePayload,
  type ProgramSummary,
  type ProgramUpdatePayload,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, Spinner } from "@/components/ui/feedback";
import ConfirmButton from "@/components/ui/confirm-button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";

function raw(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function nullable(form: FormData, key: string): string | null {
  return raw(form, key) || null;
}

function numberOrNull(form: FormData, key: string): number | null {
  const value = raw(form, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Shared field layout for the create and edit program forms. */
function ProgramFields({ defaultValue }: { defaultValue?: Partial<ProgramSummary> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Program name (English)" htmlFor="p-name" required className="lg:col-span-2">
        <Input
          id="p-name"
          name="name_en"
          placeholder="Bachelor of Computer Science"
          defaultValue={defaultValue?.name_en ?? ""}
          required
        />
      </Field>

      <Field label="Program name (Khmer)" htmlFor="p-name-kh">
        <Input id="p-name-kh" name="name_kh" defaultValue={defaultValue?.name_kh ?? ""} />
      </Field>

      <Field label="Faculty" htmlFor="p-faculty">
        <Input id="p-faculty" name="faculty" placeholder="Faculty of Engineering" defaultValue={defaultValue?.faculty ?? ""} />
      </Field>

      <Field label="Degree level" htmlFor="p-level" required>
        <Select id="p-level" name="degree_level" defaultValue={defaultValue?.degree_level ?? "BACHELOR"}>
          {DEGREE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Duration (years)" htmlFor="p-duration" required>
        <Input
          id="p-duration"
          name="duration_years"
          type="number"
          step="0.5"
          min="0.5"
          max="10"
          defaultValue={defaultValue?.duration_years ?? 4}
          required
        />
      </Field>

      <Field
        label="Tuition / year"
        htmlFor="p-tuition-year"
        hint="Not returned by the API - leave empty to keep the current value."
      >
        <Input
          id="p-tuition-year"
          name="tuition_per_year"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaultValue?.tuition_fee ?? ""}
        />
      </Field>

      <Field label="Tuition / credit" htmlFor="p-tuition-credit">
        <Input id="p-tuition-credit" name="tuition_per_credit" type="number" step="0.01" min="0" />
      </Field>

      <Field label="Currency" htmlFor="p-currency">
        <Select id="p-currency" name="fee_currency" defaultValue={defaultValue?.fee_currency ?? "USD"}>
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

export default function ProgramManager({
  universityId,
  programs,
}: {
  universityId: string;
  programs: ProgramSummary[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<ProgramSummary[]>(programs);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Keep local rows in sync when the server component refetches after router.refresh().
  useEffect(() => setItems(programs), [programs]);

  function flash(message: string) {
    setSaved(message);
    setError(null);
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nameEn = raw(form, "name_en");
    if (!nameEn) {
      setError("Program name (English) is required.");
      return;
    }

    const payload: ProgramCreatePayload = {
      name_en: nameEn,
      name_kh: nullable(form, "name_kh"),
      faculty: nullable(form, "faculty"),
      degree_level: form.get("degree_level") as DegreeLevel,
      duration_years: Number(raw(form, "duration_years") || 4),
      tuition_per_year: numberOrNull(form, "tuition_per_year"),
      tuition_per_credit: numberOrNull(form, "tuition_per_credit"),
      fee_currency: form.get("fee_currency") as Currency,
    };

    startTransition(async () => {
      try {
        const created = await apiRequest<ProgramSummary>(
          `/api/admin/universities/${universityId}/programs`,
          { method: "POST", body: payload },
        );
        setItems((current) => [...current, created]);
        setAdding(false);
        flash(`“${created.name_en}” added.`);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not add the program.");
      }
    });
  }

  function handleUpdate(program: ProgramSummary) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const nameEn = raw(form, "name_en");
      if (!nameEn) {
        setError("Program name (English) is required.");
        return;
      }

      const payload: ProgramUpdatePayload = {
        name_en: nameEn,
        name_kh: nullable(form, "name_kh"),
        faculty: nullable(form, "faculty"),
        degree_level: form.get("degree_level") as DegreeLevel,
        duration_years: Number(raw(form, "duration_years") || 1),
        fee_currency: form.get("fee_currency") as Currency,
      };
      // Only send tuition when the user typed one: the API never returns it,
      // so an untouched field must not overwrite the stored value.
      const perYear = numberOrNull(form, "tuition_per_year");
      if (perYear !== null) payload.tuition_per_year = perYear;
      const perCredit = numberOrNull(form, "tuition_per_credit");
      if (perCredit !== null) payload.tuition_per_credit = perCredit;

      startTransition(async () => {
        try {
          const updated = await apiRequest<ProgramSummary>(`/api/admin/programs/${program.id}`, {
            method: "PATCH",
            body: payload,
          });
          setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
          setEditingId(null);
          flash(`“${updated.name_en}” updated.`);
          router.refresh();
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Could not update the program.");
        }
      });
    };
  }

  function handleDelete(program: ProgramSummary) {
    return async () => {
      try {
        await apiRequest(`/api/admin/programs/${program.id}`, { method: "DELETE" });
        setItems((current) => current.filter((item) => item.id !== program.id));
        flash(`“${program.name_en}” deleted.`);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not delete the program.");
      }
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="size-4 text-primary" />
          <h3 className="text-base font-semibold">Study programs</h3>
          <Badge variant="outline">{items.length}</Badge>
        </div>
        {!adding ? (
          <Button size="sm" variant="outline" onClick={() => { setAdding(true); setEditingId(null); }}>
            <Plus className="size-4" />
            Add program
          </Button>
        ) : null}
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {saved && !error ? <Alert variant="success">{saved}</Alert> : null}

      {adding ? (
        <form onSubmit={handleCreate} className="space-y-4 rounded-xl border bg-muted/30 p-4">
          <p className="text-sm font-medium">New program</p>
          <ProgramFields />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Spinner className="size-3.5" /> : null}
              {pending ? "Adding…" : "Add program"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {items.length === 0 && !adding ? (
        <EmptyState
          title="No programs yet"
          description="Add the degree programs this university offers so students can compare them."
          action={
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus className="size-4" />
              Add program
            </Button>
          }
        />
      ) : null}

      {items.length > 0 ? (
        <div className="divide-y rounded-xl border">
          {items.map((program) =>
            editingId === program.id ? (
              <form key={program.id} onSubmit={handleUpdate(program)} className="space-y-4 bg-muted/30 p-4">
                <p className="text-sm font-medium">Edit “{program.name_en}”</p>
                <ProgramFields defaultValue={program} />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={pending}>
                    {pending ? <Spinner className="size-3.5" /> : null}
                    {pending ? "Saving…" : "Save program"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div key={program.id} className="flex flex-wrap items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {program.name_en}
                    {program.name_kh ? (
                      <span className="ml-2 font-normal text-muted-foreground">· {program.name_kh}</span>
                    ) : null}
                  </p>
                  <p className={cn("mt-0.5 truncate text-xs text-muted-foreground")}>
                    {[program.faculty ?? "No faculty", `${program.duration_years ?? "—"} yr`].join(" · ")} ·{" "}
                    {formatCurrency(program.tuition_fee, program.fee_currency)}
                  </p>
                </div>

                <Badge variant="outline">{program.degree_level}</Badge>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingId(program.id); setAdding(false); }}
                    aria-label={`Edit ${program.name_en}`}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <ConfirmButton
                    onConfirm={handleDelete(program)}
                    confirmLabel={`Delete “${program.name_en}”?`}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </ConfirmButton>
                </div>
              </div>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
