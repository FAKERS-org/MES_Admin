"use client";

import { useState, type ReactNode } from "react";

import { Spinner } from "./feedback";
import { buttonVariants } from "./button";
import { cn } from "@/lib/utils";

/**
 * Two-step destructive action: the first click arms the button, the second
 * executes it. Keeps deletes deliberate without a modal.
 */
export default function ConfirmButton({
  label = "Delete",
  confirmLabel = "Are you sure?",
  onConfirm,
  children,
  className,
  disabled,
}: {
  label?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setArmed(true)}
        className={cn(buttonVariants({ variant: "destructive", size: "sm" }), className)}
      >
        {children ?? label}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2">
      <span className="text-xs text-muted-foreground">{confirmLabel}</span>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            await onConfirm();
          } finally {
            setPending(false);
            setArmed(false);
          }
        }}
        className={buttonVariants({ variant: "destructive", size: "sm" })}
      >
        {pending ? <Spinner className="size-3.5" /> : null}
        Yes, delete
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setArmed(false)}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Cancel
      </button>
    </span>
  );
}
