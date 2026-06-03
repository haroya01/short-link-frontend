import { Skeleton } from "@/modules/blog/components/skeleton";

/**
 * The editor's loading shape (top bar → title → meta strip → body), shared by the new-post bootstrap
 * (/write/new, while the draft is being created) and the editor itself (/write/[id], while it loads).
 * Using one skeleton for both means 글쓰기 → new draft → editor swaps in continuously with no jump
 * from a spinner to a skeleton to the real surface.
 */
export function EditorSkeleton() {
  return (
    <main
      className="mx-auto flex h-[calc(100dvh-1px)] max-w-[44rem] flex-col px-5 pt-3"
      aria-busy
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <Skeleton className="h-6 w-16" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <Skeleton className="mt-6 h-9 w-3/4" />
      <div className="mt-3 flex gap-2 border-b border-slate-100 pb-5 dark:border-slate-800">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-7 w-24" />
      </div>
      <div className="mt-6 flex-1 space-y-3">
        {["w-full", "w-[92%]", "w-[97%]", "w-[60%]", "w-full", "w-[80%]"].map((w, i) => (
          <Skeleton key={i} className={`h-4 ${w}`} />
        ))}
      </div>
    </main>
  );
}
