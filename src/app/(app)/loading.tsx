import { CardGridSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
      <CardGridSkeleton />
      <TableSkeleton />
    </div>
  );
}
