import { cn } from "@/lib/utils";

/**
 * The single tag-chip primitive for the blog. Popular-tag strips, the tag cloud, post tags, and the
 * tag-feed filter all render this so a chip is visually and behaviourally identical everywhere —
 * change the recipe here, not in five places. `active` (filter strip) inverts to the brand fill;
 * `count` shows the post count when given (hidden on the active chip to keep it clean).
 */
export function TagChip({
  href,
  label,
  count,
  active = false,
  ariaCurrent,
  className,
}: {
  href: string;
  label: string;
  count?: number;
  active?: boolean;
  ariaCurrent?: "page" | "true";
  className?: string;
}) {
  return (
    <a
      href={href}
      aria-current={ariaCurrent}
      className={cn(
        "focus-ring inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-accent-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-accent-50 hover:text-accent-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-accent-500/15 dark:hover:text-accent-400",
        className,
      )}
    >
      <span>{label}</span>
      {count != null && !active && <span className="text-slate-500 dark:text-slate-500">{count}</span>}
    </a>
  );
}
