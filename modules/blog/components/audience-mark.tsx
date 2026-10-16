import { GlobeLock, Key, Link, Lock, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { cardMark, type AudienceFields, type CardMark, type PostAudience } from "@/modules/blog/lib/post-audience";

const ICONS: Record<CardMark, LucideIcon> = { UNLISTED: Link, FOLLOWERS: Lock, PASSWORD: Key, REGION: GlobeLock };

function Mark({ mark, className }: { mark: CardMark; className?: string }) {
  const t = useTranslations("publicPost.audience");
  const Icon = ICONS[mark];
  const label = t(mark);
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-audience-mark={mark}
      className={cn("inline-flex shrink-0 items-center text-slate-400 dark:text-slate-500", className)}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}

export function AudienceMark({ item, className }: { item: AudienceFields; className?: string }) {
  const mark = cardMark(item);
  return mark ? <Mark mark={mark} className={className} /> : null;
}

export function OwnerAudienceMarks({
  audience,
  blockedCountries,
  className,
}: {
  audience?: PostAudience;
  blockedCountries?: string[];
  className?: string;
}) {
  const marks: CardMark[] = [];
  if (audience && audience !== "PUBLIC") marks.push(audience);
  if (blockedCountries && blockedCountries.length > 0) marks.push("REGION");
  if (marks.length === 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {marks.map((mark) => (
        <Mark key={mark} mark={mark} />
      ))}
    </span>
  );
}
