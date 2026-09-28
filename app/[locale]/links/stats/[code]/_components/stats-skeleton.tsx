import { Skeleton } from "@/components/ui/skeleton";

export function HeaderSkeleton({ shortCode }: { shortCode?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-6">
      <Skeleton className="h-3 w-20" />
      {/* 코드는 라우트에서 이미 안다 — 스켈레톤 단계에 실코드를 그려야 대시보드 /코드 와의
          view-transition 페어(vt-link-code)가 로딩 중에도 성립한다(늦으면 old 만 남아 모프 무산). */}
      {shortCode ? (
        <p className="vt-link-code mt-3 w-fit truncate text-base font-semibold leading-snug tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
          /{shortCode}
        </p>
      ) : (
        <Skeleton className="mt-3 h-7 w-56" />
      )}
      <Skeleton className="mt-3 h-4 w-72" />
    </div>
  );
}

/** 통계를 받는 동안의 자리 — 머리 아래 탭 줄·본문 자리까지 한 화면 이상을 채운다. */
export function StatsSkeleton({ shortCode }: { shortCode?: string }) {
  return (
    <>
      <HeaderSkeleton shortCode={shortCode} />
      <div aria-hidden className="min-h-screen space-y-5">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </>
  );
}
