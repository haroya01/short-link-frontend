import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps the author page's content column on the tab surface (글 · 시리즈 · 소개 · 좋아요 · 북마크). The
 * tab content rides the calm site-wide root crossfade on a switch — no per-column slide, because the
 * tabs' heights differ wildly (글 = a tall post list, 소개 = a short bio) and a sized view-transition
 * group morphed that into a diagonal, laggy slide. Presentational marker only (no view-transition-name
 * — see the `.author-vt-content` note in globals.css); kept as the column's named wrapper.
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
