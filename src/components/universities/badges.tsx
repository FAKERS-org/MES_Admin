import { Badge } from "@/components/ui/badge";
import { type Ministry, type Status, type UniversityType, MINISTRY_LABELS } from "@/lib/types";

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

export function MinistryBadge({ ministry }: { ministry?: Ministry | null }) {
  if (!ministry) return null;
  const label = MINISTRY_LABELS[ministry];
  return (
    <Badge
      variant="outline"
      className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-xs font-medium"
      title={label ? `${label.en} (${label.kh})` : ministry}
    >
      {label?.short ?? ministry}
    </Badge>
  );
}

export function AccreditedBadge({ accredited }: { accredited: boolean }) {
  return accredited ? <Badge variant="success">MoEYS</Badge> : null;
}
