import { FeedListSkeleton } from "@/modules/blog/components/feed-card";

/**
 * Loading skeleton for the author surface (posts / series / about) while it fetches — an author
 * header placeholder + the shared list skeleton, on the centered column. Dark-aware.
 */
export default function AuthorLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl animate-pulse">
        <div className="flex items-start gap-5">
          <div className="h-20 w-20 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="h-7 w-40 rounded bg-slate-200/80 dark:bg-slate-700/80" />
            <div className="h-4 w-56 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-8 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
        <div className="mt-8 h-px bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="mx-auto mt-8 max-w-2xl">
        <FeedListSkeleton />
      </div>
    </main>
  );
}
