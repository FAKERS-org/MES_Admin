import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "outline";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "border-transparent bg-primary/10 text-primary",
  success: "border-transparent bg-success/15 text-success",
  warning: "border-transparent bg-warning/20 text-warning dark:bg-warning/15",
  destructive: "border-transparent bg-destructive/10 text-destructive",
  outline: "border-border text-muted-foreground",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
