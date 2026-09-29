import { Mark } from "@/components/common/logo";
import { linksHref } from "@/lib/host";
import { cn } from "@/lib/utils";

export type MadeWithKurlTone = { text: string; strong: string; border: string };

const SITE_TONE: MadeWithKurlTone = {
  text: "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
  strong: "text-slate-700 dark:text-slate-200",
  border: "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700",
};

/**
 * The viral-loop badge for user-distributed pages (link-in-bio, QR landings, etc.). Every shared
 * page becomes an ad for kurl — the growth mechanism Linktree / Carrd / Typeform rode. Unlike the
 * old muted text line, this is a real link back to kurl with a `ref` so badge-driven signups are
 * attributable. Brand string kept in English on purpose (untranslated, like "Made with Typeform").
 *
 * Profile pages paint their own theme regardless of the site's dark mode, so they pass the theme's
 * text/border classes as `tone`; everywhere else the site tone follows dark mode.
 */
export function MadeWithKurl({ className, tone = SITE_TONE }: { className?: string; tone?: MadeWithKurlTone }) {
  return (
    <a
      href={linksHref("/?ref=made-with-kurl")}
      target="_blank"
      rel="noopener"
      className={cn(
        "focus-ring inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors",
        tone.border,
        tone.text,
        className,
      )}
    >
      <Mark className="h-3 text-accent-600" />
      <span>
        Made with <span className={cn("font-bold", tone.strong)}>kurl</span>
      </span>
    </a>
  );
}
