import { Skeleton } from "@/modules/blog/components/skeleton";

/**
 * Series-index content skeleton (icon + title + post-count rows), on the centered column. The header
 * (identity + tabs) is held by the persistent layout (ProfileChrome), so this fallback is content-only
 * — the header stays put while the series list streams in.
 */
export default function SeriesIndexLoading() {
  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-3" aria-busy>
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
  );
}
