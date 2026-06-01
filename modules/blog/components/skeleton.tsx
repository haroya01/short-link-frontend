/**
 * Shared loading skeletons for the blog workspace. The whole point is that a loading surface is
 * never blank and never a bare "loading…" line — it mirrors the real layout so content swaps in
 * without a flash or a jump. Pure presentation, dark-aware, `aria-hidden` (a parent region carries
 * the aria-busy/live state). Uses the existing `animate-pulse` rhythm.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded bg-slate-100 dark:bg-slate-800 ${className}`}
    />
  );
}

/** A page header block — title + optional subtitle, matching the workspace `text-2xl` heading rhythm. */
export function SkeletonHeader({ subtitle = false }: { subtitle?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-40" />
      {subtitle && <Skeleton className="h-4 w-64" />}
    </div>
  );
}

/** Stat cards row (analytics / links overview). */
export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Vertical list of rows (post lists, ranked lists, leads, members). `thumb` adds a leading square. */
export function SkeletonRows({ count = 5, thumb = false }: { count?: number; thumb?: boolean }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          {thumb && <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Generic workspace content skeleton — header + stat cards + rows. Used as the auth-resolving
 * placeholder in the layout (so a workspace navigation never flashes an empty pane before the real
 * page mounts) and as a sensible default for dashboard-shaped pages.
 */
export function WorkspaceSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10" aria-hidden>
      <SkeletonHeader subtitle />
      <div className="mt-6">
        <SkeletonStatCards />
      </div>
      <div className="mt-8">
        <SkeletonRows count={5} />
      </div>
    </div>
  );
}
