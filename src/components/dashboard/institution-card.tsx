import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { getSubjectCount } from "@/data/subjects";
import { cn } from "@/lib/utils";
import type { Institution } from "@/data/institutions";

export interface InstitutionCardProps {
  institution: Institution;
  to?: string;
  className?: string;
}

function InstitutionCard({ institution, to, className }: InstitutionCardProps) {
  const { t } = useLanguage();
  const name = t(institution.nameKey);
  const count = getSubjectCount(institution.id);
  return (
    <Link
      to={to ?? `/exam/${institution.id}`}
      className={cn(
        "flex flex-col items-center rounded-xl border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <img src={institution.logo} alt={name} className="mb-4 size-24 rounded-full object-contain" />
      <p className="mb-2 min-h-[2.75rem] text-sm font-semibold leading-snug text-foreground">{name}</p>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <BookOpen className="size-3.5" />
        <span>{t("overview.subjects", { count })}</span>
      </div>
    </Link>
  );
}

export default InstitutionCard;
