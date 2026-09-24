import { Badge } from "@/components/ui/badge";
import type { Status, UniversityType } from "@/lib/types";

export function StatusBadge({ status }: { status: Status }) {
  return status === "PUBLISHED" ? (
    <Badge variant="success">Published</Badge>
  ) : (
    <Badge variant="warning">Draft</Badge>
  );
}

export function TypeBadge({ type }: { type: UniversityType }) {
  return <Badge variant={type === "PUBLIC" ? "default" : "outline"}>{type}</Badge>;
}

export function AccreditedBadge({ accredited }: { accredited: boolean }) {
  return accredited ? <Badge variant="success">MoEYS</Badge> : null;
}
