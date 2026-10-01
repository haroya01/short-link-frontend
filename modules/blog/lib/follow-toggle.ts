import { cn } from "@/lib/utils";

/**
 * One follow/subscribe toggle for authors, series and tags: not yet = the primary fill, already = a
 * quiet outline (the caller adds a check). The border stays in both states so the box never jumps.
 * `quiet` is for rows that repeat down a list (추천 작가, 시리즈 카드) or sit beside the page's own
 * primary: a green outline instead of the fill, so a view keeps one filled green button.
 */
export function followToggleClass(on: boolean, compact = false, quiet = false) {
  return cn(
    "touch-target focus-ring inline-flex shrink-0 items-center rounded-lg border font-semibold transition-colors duration-200",
    compact ? "h-7 px-3 text-[12px]" : "h-9 px-4 text-[14px]",
    on
      ? "border-slate-300 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
      : quiet
        ? "border-accent-600/50 text-accent-700 hover:border-accent-600 hover:bg-accent-50 dark:border-accent-400/40 dark:text-accent-300 dark:hover:border-accent-400 dark:hover:bg-accent-500/10"
        : "border-transparent bg-accent-700 text-white hover:bg-accent-800",
  );
}
