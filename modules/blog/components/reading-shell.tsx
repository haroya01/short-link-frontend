import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The single source of truth for the blog's reading-column invariant (AGENTS.md §10.1): the body is a
 * centered `max-w-2xl` column on every surface (feed home · post · author · tags), and an optional rail
 * lives in the margin **without shifting that column** — a symmetric 3-column grid (equal side gutters)
 * keeps the content in the exact page center. Rail shows at `xl+` only; below that the column simply
 * centers and the rail drops away.
 *
 * Extracted so the grid string isn't copy-pasted across surfaces (the copy-paste is exactly how the tag
 * page drifted out of the pattern). Pass `rail` to get the 3-column layout; omit it for a plain column.
 * Presentational only — safe in both server and client components.
 */
export function ReadingShell({
  children,
  rail,
  leftRail,
  className,
}: {
  children: ReactNode;
  /** Optional sidebar content; rendered sticky in the right gutter at `xl+`. Falsy → no rail. */
  rail?: ReactNode;
  /** Optional content for the *left* gutter (col 1) — author context on the series page, where the
   *  rail reads as "whose series is this" rather than cross-author discovery. Sticky at `xl+`. */
  leftRail?: ReactNode;
  /** Extra classes on the outer wrapper — e.g. top margin (`mt-8`). */
  className?: string;
}) {
  if (!rail && !leftRail) {
    return <div className={cn("mx-auto max-w-2xl", className)}>{children}</div>;
  }
  return (
    <div
      className={cn(
        "mx-auto max-w-2xl xl:grid xl:max-w-7xl xl:grid-cols-[1fr_minmax(0,42rem)_1fr] xl:gap-10",
        className,
      )}
    >
      {leftRail && (
        <aside className="mb-12 hidden xl:col-start-1 xl:row-start-1 xl:mb-0 xl:block">
          <div className="sticky top-20">{leftRail}</div>
        </aside>
      )}
      <div className="xl:col-start-2 xl:row-start-1">{children}</div>
      {rail && (
        <aside className="mt-12 hidden xl:col-start-3 xl:row-start-1 xl:mt-0 xl:block">
          <div className="sticky top-20">{rail}</div>
        </aside>
      )}
    </div>
  );
}
