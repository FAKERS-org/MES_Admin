import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Small labelled statistic used on the dashboard. */
export function StatCard({
  label,
  value,
  hint,
  accent,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "primary" | "success" | "warning" | "muted";
  className?: string;
}) {
  const dot = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    muted: "bg-muted-foreground",
  }[accent ?? "muted"];

  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-sm", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={cn("size-2 rounded-full", dot)} aria-hidden />
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
