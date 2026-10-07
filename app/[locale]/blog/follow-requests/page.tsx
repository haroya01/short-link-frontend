"use client";

import { ArrowLeft, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogHref, blogPath } from "@/lib/host";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { authorHref } from "@/modules/blog/lib/author-href";
import { blogCta } from "@/modules/blog/components/blog-cta";
import { ErrorState } from "@/components/common/error-state";
import { FollowRequestAnswer } from "@/modules/notifications/components/follow-request-answer";
import { useRelativeTime } from "@/modules/notifications/lib/relative-time";
import { useFollowRequests } from "@/modules/notifications/lib/use-notifications";

/** 기다리는 팔로우 요청 — 이 서버 회원과 다른 서버 계정을 한 목록에서 승인·거절한다(마스토돈 잠긴 계정). */
export default function FollowRequestsPage() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const relative = useRelativeTime();
  const { ready, authenticated } = useAuth();
  const { data, isLoading, isError, refetch } = useFollowRequests();

  if (ready && !authenticated) {
    return (
      <main className="flex flex-col items-start gap-4 px-6 py-12">
        <p className="text-slate-600 dark:text-slate-300">{t("loginRequired")}</p>
        <a
          href={`${blogHref("/login")}?next=${encodeURIComponent("/follow-requests")}`}
          className={blogCta({ variant: "secondary" })}
        >
          {t("loginCta")}
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <BlogLink
        href={blogPath("/notifications")}
        className="focus-ring -ml-1 inline-flex items-center gap-1 rounded text-[13px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        {t("title")}
      </BlogLink>
      <h1 className="mt-2 text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
        {t("followRequestsTitle")}
      </h1>

      <div className="mt-4">
        {!ready || isLoading ? (
          <div role="status" aria-busy="true" className="space-y-1 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-3.5">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800" />
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <Lock aria-hidden className="h-6 w-6 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">{t("followRequestsEmpty")}</p>
            <p className="mt-1 max-w-sm text-[13px] text-slate-500 dark:text-slate-400">{t("followRequestsEmptyHint")}</p>
          </div>
        ) : (
          <ul>
            {data.map((r) => {
              const href =
                "remoteId" in r.origin ? blogPath(`/remote/${r.origin.remoteId}`) : authorHref(r.handle, locale);
              return (
                <li
                  key={r.key}
                  data-testid={`follow-request-${r.handle}`}
                  className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-2 py-3.5 last:border-b-0 dark:border-slate-800/80"
                >
                  <BlogLink href={href} className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-lg">
                    <Avatar src={r.avatarUrl} name={r.handle} size="md" />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                        {r.displayName || r.handle}
                      </span>
                      <span className="block truncate text-[13px] text-slate-500 dark:text-slate-400">
                        @{r.handle}
                        {r.requestedAt && <> · {relative(r.requestedAt)}</>}
                      </span>
                    </span>
                  </BlogLink>
                  <FollowRequestAnswer origin={r.origin} name={r.displayName || r.handle} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
