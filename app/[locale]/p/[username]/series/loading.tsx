import { Skeleton } from "@/modules/blog/components/skeleton";

/**
 * Series-index skeleton. Mirrors the series list (icon + title + post-count rows) rather than the
 * parent post-list skeleton, so the shape matches what's loading.
 */
export default function SeriesIndexLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 sm:py-16" aria-busy>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start gap-5">
          <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3 pt-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="mt-8 h-px bg-slate-100 dark:bg-slate-800" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 dark:border-slate-800"
            >
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
