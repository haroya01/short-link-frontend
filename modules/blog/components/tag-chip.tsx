import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The single tag-chip primitive for the blog. Popular-tag strips, the tag cloud, post tags, and the
 * tag-feed filter all render this so a chip is visually and behaviourally identical everywhere —
 * change the recipe here, not in five places. `active` (filter strip) inverts to the brand fill;
 * `count` shows the post count when given (hidden on the active chip to keep it clean).
 *
 * `soft` renders a next/link so a blog→blog hop client-navigates (layout/header/auth stay mounted,
 * no per-nav flicker); pass a same-origin relative href (blogPath) with it.
 */
export function TagChip({
  href,
  label,
  count,
  active = false,
  ariaCurrent,
  className,
  soft = false,
  onClick,
}: {
  href: string;
  label: string;
  count?: number;
  active?: boolean;
  ariaCurrent?: "page" | "true";
  className?: string;
  soft?: boolean;
  /** Fires on click (before navigation) — e.g. to dismiss the explore sheet a chip is rendered in,
   *  which lives in a parent that a soft-nav wouldn't otherwise unmount. */
  onClick?: () => void;
}) {
  const cls = cn(
    "focus-ring inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
    active
      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100",
    className,
  );
  const inner = (
    <>
      <span>{label}</span>
      {count != null && !active && (
        <span className="text-slate-600 dark:text-slate-400">{count}</span>
      )}
    </>
  );
  return soft ? (
    <Link href={href} aria-current={ariaCurrent} className={cls} onClick={onClick}>
      {inner}
    </Link>
  ) : (
    <a href={href} aria-current={ariaCurrent} className={cls} onClick={onClick}>
      {inner}
    </a>
  );
}
