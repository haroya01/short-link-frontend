"use client";

import { ArrowLeft, Bell, ListFilter } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogPath } from "@/lib/host";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { authorHref } from "@/modules/blog/lib/author-href";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { ErrorState } from "@/components/common/error-state";
import { useToast } from "@/components/ui/toast";
import type { FilteredSender } from "@/modules/notifications/api/notification-policy";
import { useRelativeTime } from "@/modules/notifications/lib/relative-time";
import { useAnswerFilteredSender, useFilteredSenders } from "@/modules/notifications/lib/use-notifications";

/** 알림 거르기가 따로 둔 알림 — 보낸 사람별로 받기(그 뒤로도 옴)·버리기(모아 둔 알림 삭제). */
export default function FilteredNotificationsPage() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const relative = useRelativeTime();
  const { toast } = useToast();
  const { ready, authenticated } = useAuth();
  const { data, isLoading, isError, refetch } = useFilteredSenders();
  const answer = useAnswerFilteredSender();

  if (ready && !authenticated) {
    return (
      <main>
        <SignInEmptyState page reason="notifications" icon={Bell} />
      </main>
    );
  }

  function reply(sender: FilteredSender, accept: boolean) {
    answer.mutate(
      { sender, accept },
      {
        onSuccess: () => accept && toast(t("filteredAccepted", { name: sender.username })),
        onError: () => toast(t("filteredError"), "error"),
      },
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
        {t("filteredTitle")}
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
            <ListFilter aria-hidden className="h-6 w-6 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">{t("filteredEmpty")}</p>
            <p className="mt-1 max-w-sm text-[13px] text-slate-500 dark:text-slate-400">{t("filteredEmptyHint")}</p>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">{t("filteredHint")}</p>
            <ul className="mt-2">
              {data.map((s) => {
                const href =
                  s.actorRemoteId != null ? blogPath(`/remote/${s.actorRemoteId}`) : authorHref(s.username, locale);
                return (
                  <li
                    key={`${s.actorUserId}:${s.actorRemoteId}`}
                    data-testid={`filtered-${s.username}`}
                    className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-2 py-3.5 last:border-b-0 dark:border-slate-800/80"
                  >
                    <BlogLink href={href} className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-surface">
                      <Avatar src={s.avatarUrl} name={s.username} size="md" />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                          {s.username}
                        </span>
                        <span className="block truncate text-[13px] text-slate-500 dark:text-slate-400">
                          {t("filteredCount", { count: s.count })}
                          {s.lastAt && <> · {relative(s.lastAt)}</>}
                        </span>
                      </span>
                    </BlogLink>
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => reply(s, false)}
                        data-testid="filtered-dismiss"
                        className="focus-ring inline-flex h-8 items-center rounded-full border border-slate-300 px-3.5 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600"
                      >
                        {t("filteredDismiss")}
                      </button>
                      <button
                        type="button"
                        onClick={() => reply(s, true)}
                        data-testid="filtered-accept"
                        className="focus-ring inline-flex h-8 items-center rounded-full bg-accent-700 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-800 dark:bg-accent-600 dark:hover:bg-accent-500"
                      >
                        {t("filteredAccept")}
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
