"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { Alert } from "@/components/ui/feedback";
import ConfirmButton from "@/components/ui/confirm-button";

export default function DeleteUniversity({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      await apiRequest(`/api/admin/universities/${id}`, { method: "DELETE" });
      router.push("/universities");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the university.");
    }
  }

  return (
    <div className="space-y-3">
      {error ? <Alert>{error}</Alert> : null}
      <p className="text-sm text-muted-foreground">
        Removes <span className="font-medium text-foreground">{name}</span> and every program linked to it.
        This cannot be undone.
      </p>
      <ConfirmButton
        onConfirm={handleDelete}
        label={`Delete “${name}”`}
        confirmLabel="Delete this university and all of its programs?"
        className="w-full"
      >
        <Trash2 className="size-4" />
        Delete university
      </ConfirmButton>
    </div>
  );
}
