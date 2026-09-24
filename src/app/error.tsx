"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
        <div>
          <p className="text-sm font-medium text-destructive">Something went wrong</p>
          <h1 className="mt-1 text-lg font-semibold">We could not load this page</h1>
        </div>
        <p className="break-words rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {error.message || "Unexpected error"}
        </p>
        <div className="flex items-center justify-center gap-2">
          <button type="button" onClick={reset} className={buttonVariants({ variant: "outline" })}>
            Try again
          </button>
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
