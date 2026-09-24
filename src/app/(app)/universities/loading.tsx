import { TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-24 animate-pulse rounded-xl border bg-card" />
      <TableSkeleton rows={8} columns={6} />
    </div>
  );
}
