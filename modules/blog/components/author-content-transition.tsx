import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Names the author page's content column as its own view-transition group (`author-content`) so a tab
 * switch slides just this column horizontally — the author-surface twin of the feed's
 * FeedContentTransition. Wrap only the center column (not the rail) so the rail rides the calm root
 * crossfade while the content pages left/right.
 *
 * The slide direction is set on <html> (data-author-nav) by the author layout's pagereveal script and
 * realized by the `::view-transition-*(author-content)` rules in globals.css. First visit / a same-tab
 * refresh / unsupported browsers fall back to the default crossfade. Presentational only.
 */
export function AuthorContentTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("author-vt-content", className)}>{children}</div>;
}
