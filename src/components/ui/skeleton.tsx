import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";

/** Table body placeholder shown while a server component is loading. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-3">
          {Array.from({ length: columns }).map((__, col) => (
            <div
              key={col}
              className={cn("h-4 animate-pulse rounded bg-muted", col === 0 ? "w-1/3" : "w-1/6")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl border bg-card" />
      ))}
    </div>
  );
}

/** Full-page fallback used by loading.tsx. */
export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Spinner className="size-4" />
      {label}
    </div>
  );
}

export { buttonVariants };
