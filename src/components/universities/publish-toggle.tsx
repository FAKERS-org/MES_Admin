"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";

import { apiRequest } from "@/lib/api";
import type { Status } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";

export default function PublishToggle({ id, status }: { id: string; status: Status }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const publishing = status === "DRAFT";

  function toggle() {
    setError(null);
    const next: Status = publishing ? "PUBLISHED" : "DRAFT";
    startTransition(async () => {
      try {
        await apiRequest(`/api/admin/universities/${id}`, { method: "PATCH", body: { status: next } });
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not change the status.");
      }
    });
  }

  return (
    <div className="space-y-2">
      {error ? <Alert>{error}</Alert> : null}
      <Button className="w-full" variant={publishing ? "default" : "outline"} onClick={toggle} disabled={pending}>
        {pending ? <Spinner className="size-4" /> : publishing ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        {pending ? "Updating…" : publishing ? "Publish" : "Unpublish"}
      </Button>
      <p className="text-xs text-muted-foreground">
        {publishing
          ? "Publishing makes this university and its profile visible on the public apps."
          : "Unpublishing hides it from the public apps; the data stays untouched."}
      </p>
    </div>
  );
}
