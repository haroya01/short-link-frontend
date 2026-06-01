import { Skeleton } from "@/modules/blog/components/skeleton";

/**
 * Series-detail skeleton — series header + a numbered list of member posts (the real layout), not
 * the inherited post-list skeleton.
 */
export default function SeriesDetailLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 sm:py-16" aria-busy>
      <div className="mx-auto max-w-2xl">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-8 w-2/3" />
        <Skeleton className="mt-2 h-4 w-32" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-6 w-6 shrink-0 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
