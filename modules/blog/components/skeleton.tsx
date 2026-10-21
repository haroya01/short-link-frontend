
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded bg-slate-100 dark:bg-slate-800 ${className}`}
    />
  );
}

function SkeletonHeader({ subtitle = false }: { subtitle?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-40" />
      {subtitle && <Skeleton className="h-4 w-64" />}
    </div>
  );
}

/** StatCard 와 같은 비박스 모양이어야 로딩 끝에 레이아웃이 점프하지 않는다. */
export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 5, thumb = false }: { count?: number; thumb?: boolean }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          {thumb && <Skeleton className="h-12 w-12 shrink-0 rounded-inner" />}
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
