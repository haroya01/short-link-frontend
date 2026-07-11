import type { ReactNode } from "react";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One idiom for the standalone cross-surface hop (blog ↔ kurl ↔ 프로필). The three products are
 * separate surfaces on a shared identity ("blog = 읽기 / kurl = 링크·프로필"), so moving between them
 * gets a single quiet capsule rather than a different bespoke button on each screen: a hairline
 * pill, slate at rest, a green (brand) thread that surfaces on hover, a leading context icon and a
 * trailing ↗ that reads as "this leaves for the other surface". The AppsGrid warp pill (the primary
 * header switch) and the profile page's theme-colored bridge stay their own thing — this is for the
 * contextual, in-page cross-product links that were drifting apart in style.
 *
 * Cross-host in prod (blog.kurl.me ↔ kurl.me ↔ {user}.kurl.me), so it renders a plain `<a>` full
 * load like the other host-pinned links — pass an already-resolved href (blogHref/linksHref/cardHref).
 */
export function SwitchLink({
  href,
  icon: Icon,
  children,
  size = "sm",
  className,
  title,
}: {
  href: string;
  icon: LucideIcon;
  children: ReactNode;
  /** "sm" for inline chrome (author header, settings), "md" for a standalone footer bridge. */
  size?: "sm" | "md";
  className?: string;
  title?: string;
}) {
  return (
    <a
      href={href}
      title={title}
      className={cn(
        "focus-ring group inline-flex items-center rounded-full border border-slate-200 font-medium text-slate-600 transition-colors hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-accent-500/50 dark:hover:text-accent-400",
        size === "sm" ? "gap-1.5 px-3.5 py-1.5 text-[13px]" : "gap-2 px-4 py-2 text-[14px]",
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
      <span>{children}</span>
      <ArrowUpRight
        className={cn(
          "text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 dark:text-slate-500",
          size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
        )}
        aria-hidden
      />
    </a>
  );
}
