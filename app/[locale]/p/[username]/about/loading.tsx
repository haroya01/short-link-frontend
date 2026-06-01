import { Skeleton } from "@/modules/blog/components/skeleton";

/**
 * About-tab skeleton. The parent [username]/loading.tsx shows a post-list skeleton, which would be
 * the wrong shape here (About is bio prose + a contribution graph) — so this dedicated fallback
 * mirrors the About layout instead, on the same centered column.
 */
export default function AboutLoading() {
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
          {["w-full", "w-[95%]", "w-[88%]", "w-[72%]"].map((w, i) => (
            <Skeleton key={i} className={`h-4 ${w}`} />
          ))}
        </div>
        <Skeleton className="mt-10 h-32 w-full rounded-xl" />
      </div>
    </main>
  );
}
