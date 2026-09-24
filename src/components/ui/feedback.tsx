import { LoaderCircle } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("animate-spin", className)} aria-hidden />;
}

export function SpinnerButton({
  pending,
  children,
  className,
}: {
  pending: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {pending ? <Spinner className="size-4" /> : null}
      {children}
    </span>
  );
}

/** Inline status message for forms and mutations. */
export function Alert({
  variant = "destructive",
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "destructive" | "success" | "info" }) {
  const styles = {
    destructive: "border-destructive/40 bg-destructive/10 text-destructive",
    success: "border-success/40 bg-success/10 text-success",
    info: "border-border bg-muted text-muted-foreground",
  }[variant];

  return (
    <div role="alert" className={cn("rounded-md border px-3 py-2 text-sm", styles, className)} {...props}>
      {children}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">{title}</div>
        {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
