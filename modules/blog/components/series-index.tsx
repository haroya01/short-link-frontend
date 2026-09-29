import { cn } from "@/lib/utils";

/**
 * The single source of truth for how a series position renders across every surface — the feed series
 * card, the on-post banner, the series detail list, and the all-series index. A plain tabular number,
 * locale-agnostic so there's no 편 / Part / 回 drift between surfaces. `current` inks + bolds it (the
 * you-are-here episode in the banner, the spotlit member in the feed card).
 *
 * Server-safe (no client hooks) so it drops into both the server pages and the client lists.
 */
export function SeriesIndex({
  n,
  current = false,
  className,
}: {
  n: number;
  current?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tabular-nums transition-colors",
        current
          ? "font-semibold text-slate-900 dark:text-slate-100"
          : "text-slate-500 dark:text-slate-400",
        className,
      )}
    >
      {n}
    </span>
  );
}
