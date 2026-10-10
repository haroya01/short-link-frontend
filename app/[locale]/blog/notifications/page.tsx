"use client";

import { Bell, ChevronRight, ListFilter, Lock } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import {
  useFilteredSenders,
  useFollowRequests,
  useMarkAllRead,
  useNotifications,
  useReadHiddenNotices,
  useUnreadCount,
} from "@/modules/notifications/lib/use-notifications";
import { blogPath } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { blogCta } from "@/modules/blog/components/blog-cta";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { NotificationItem } from "@/modules/notifications/components/notification-item";
import { ErrorState } from "@/components/common/error-state";
import type { NotificationItem as Item } from "@/modules/notifications/api/notifications";
import { noticeHidden, useNoteFilters } from "@/modules/notes/lib/note-filters";

/**
 * Full notification feed — the mobile surface (the desktop header bell offers a dropdown peek) and a
 * deep link from "모든 알림 보기". Cursor-paginated with a 더 보기 button.
 *
 * 시간 묶음(오늘 · 어제 · 이번 주 · 이전)으로 끊어 읽는다 — 알림은 "몰아서 확인"하는 표면이라
 * 평평한 한 줄 목록보다 "언제 일어난 일인지"가 1차 구조다. 행 문법은 §10.2 list-row(헤어라인).
 */

type GroupKey = "groupToday" | "groupYesterday" | "groupWeek" | "groupEarlier";

function groupOf(iso: string, now: Date): GroupKey {
  const d = new Date(iso);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const today = startOfDay(now);
  const t = startOfDay(d);
  const day = 24 * 60 * 60 * 1000;
  if (t >= today) return "groupToday";
  if (t >= today - day) return "groupYesterday";
  if (t >= today - 6 * day) return "groupWeek";
  return "groupEarlier";
}

const GROUP_ORDER: GroupKey[] = ["groupToday", "groupYesterday", "groupWeek", "groupEarlier"];

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const { ready, authenticated, me } = useAuth();
  const unread = useUnreadCount();
  const markAll = useMarkAllRead();
  const { data, isLoading, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useNotifications();
  const filters = useNoteFilters();
  const all = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  useReadHiddenNotices(all, filters, me?.id);
  const waiting = useFollowRequests().data?.length ?? 0;
  const filtered = useFilteredSenders().data ?? [];
  const filteredCount = filtered.reduce((sum, s) => sum + s.count, 0);

  // 로그인 여부가 확정되기 전(!ready)에는 로그인 안내 대신 스켈레톤을 유지 — 하드 로드 시 빈 화면 플래시 방지.
  if (ready && !authenticated) {
    return (
      <main>
        <SignInEmptyState page reason="notifications" icon={Bell} />
      </main>
    );
  }

  const items = all.filter((item) => !noticeHidden(item, filters, me?.id));
  const now = new Date();
  const groups = new Map<GroupKey, Item[]>();
  for (const item of items) {
    const key = groupOf(item.createdAt, now);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
          {t("title")}
        </h1>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            className="touch-target focus-ring rounded-surface px-2 py-1 text-[13px] font-medium text-accent-700 transition-colors hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-500/10"
          >
            {t("markAllRead")}
          </button>
        )}
      </div>

      {waiting > 0 && (
        // 잠긴 계정에 기다리는 요청이 있으면 맨 위 한 줄 — 마스토돈 알림 위 "팔로우 요청".
        <BlogLink
          href={blogPath("/follow-requests")}
          data-testid="follow-requests-entry"
          className="focus-ring mt-4 flex items-center gap-3 rounded-surface border-b border-slate-100 px-2 py-3.5 transition-colors hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/60"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Lock aria-hidden className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </span>
          <span className="flex-1 text-[14px] font-semibold text-slate-900 dark:text-slate-100">
            {t("followRequestsTitle")}
          </span>
          <span className="text-[13px] tabular-nums text-slate-500 dark:text-slate-400">{waiting}</span>
          <ChevronRight aria-hidden className="h-4 w-4 text-slate-400" />
        </BlogLink>
      )}

      {filtered.length > 0 && (
        // 알림 거르기가 따로 둔 알림 — 마스토돈 "걸러진 알림" 한 줄.
        <BlogLink
          href={blogPath("/notifications/filtered")}
          data-testid="filtered-entry"
          className="focus-ring mt-1 flex items-center gap-3 rounded-surface border-b border-slate-100 px-2 py-3.5 transition-colors hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/60"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ListFilter aria-hidden className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{t("filteredTitle")}</span>
            <span className="text-[12px] text-slate-500 dark:text-slate-400">
              {t("filteredSummary", { people: filtered.length, count: filteredCount })}
            </span>
          </span>
          <ChevronRight aria-hidden className="h-4 w-4 text-slate-400" />
        </BlogLink>
      )}

      <div className="mt-4">
        {!ready || isLoading ? (
          // 실제 행 모양의 펄스 스켈레톤 — "…" 한 글자는 빈 화면과 구분이 안 됐다.
          <div role="status" aria-busy="true" className="space-y-1 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-2 py-3.5">
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800" />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          // 로드 실패를 '알림 없음' 빈 상태로 위장하지 않는다 — 명시적 에러 + 재시도.
          <ErrorState onRetry={() => refetch()} />
        ) : items.length === 0 ? (
          <BlogEmpty
            icon={Bell}
            title={t("empty")}
            body={t("emptyBody")}
            action={
              <BlogLink href={blogPath("/")} className={blogCta({ variant: "secondary" })}>
                {t("browseFeed")}
              </BlogLink>
            }
          />
        ) : (
          GROUP_ORDER.filter((key) => groups.has(key)).map((key) => (
            <section key={key} className="mt-5 first:mt-1" aria-label={t(key)}>
              <h2 className="px-2 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                {t(key)}
              </h2>
              <ul className="mt-1.5">
                {groups.get(key)!.map((item) => (
                  <li
                    key={item.id}
                    className="border-b border-slate-100 last:border-b-0 dark:border-slate-800/80"
                  >
                    <NotificationItem item={item} roomy />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {hasNextPage && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="focus-ring rounded-full border border-slate-200 px-5 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
          >
            {t("loadMore")}
          </button>
        </div>
      )}
    </main>
  );
}
