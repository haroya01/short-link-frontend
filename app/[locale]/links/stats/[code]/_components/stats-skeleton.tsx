import { Skeleton } from "@/components/ui/skeleton";

export function StatsSkeleton({ shortCode }: { shortCode?: string }) {
  return (
    <div aria-hidden className="min-h-screen space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="relative text-headline-sm sm:text-headline-md">
            &nbsp;
            <Skeleton className="absolute inset-y-[0.2em] left-0 w-64 max-w-full" />
          </div>
          <p className="mt-1.5 text-sm">
            <span className="vt-link-code truncate font-mono font-medium text-accent-700 dark:text-accent-400">
              {(process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")}/{shortCode}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-16 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
      <div className="flex h-10 items-center gap-6 border-b border-slate-200 dark:border-slate-800">
        {[40, 56, 56, 56, 32, 32].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: w }} />
        ))}
      </div>
      <div className="space-y-2 border-b border-slate-200 pb-6 dark:border-slate-800">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="mt-8 h-40 w-full rounded-lg" />
    </div>
  );
}
