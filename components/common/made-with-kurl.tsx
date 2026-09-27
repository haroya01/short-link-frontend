import { Mark } from "@/components/common/logo";
import { linksHref } from "@/lib/host";
import { cn } from "@/lib/utils";

/**
 * The viral-loop badge for user-distributed pages (link-in-bio, QR landings, etc.). Every shared
 * page becomes an ad for kurl — the growth mechanism Linktree / Carrd / Typeform rode. Unlike the
 * old muted text line, this is a real link back to kurl with a `ref` so badge-driven signups are
 * attributable. Brand string kept in English on purpose (untranslated, like "Made with Typeform").
 */
export function MadeWithKurl({ className }: { className?: string }) {
  return (
    <a
      href={linksHref("/?ref=made-with-kurl")}
      target="_blank"
      rel="noopener"
      className={cn(
        "glass-capsule focus-ring inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 px-3 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 dark:border-slate-700/80 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200",
        className,
      )}
    >
      <Mark className="h-3 text-accent-600" />
      <span>
        Made with <span className="font-bold text-slate-700 dark:text-slate-200">kurl</span>
      </span>
    </a>
  );
}
