import { cn } from "@/lib/utils";

/**
 * The single source of truth for how a series position renders across every surface — the feed series
 * card, the on-post banner, the series detail list, and the all-series index. A quiet `font-mono
 * tabular-nums` zero-padded number (the weblog-spine idiom from AGENTS.md), locale-agnostic so there's
 * no 편 / Part / 回 drift between surfaces. `current` brightens + bolds it (the you-are-here episode
 * in the banner, the spotlit member in the feed card).
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
        "font-mono tabular-nums transition-colors",
        current
          ? "font-semibold text-accent-700 dark:text-accent-300"
          : "text-accent-500/70 dark:text-accent-400/70",
        className,
      )}
    >
      {String(n).padStart(2, "0")}
    </span>
  );
}
