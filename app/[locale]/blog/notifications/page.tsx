"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import {
  useMarkAllRead,
  useNotifications,
  useUnreadCount,
} from "@/modules/notifications/lib/use-notifications";
import { blogHref } from "@/lib/host";
import { blogCta } from "@/modules/blog/components/blog-cta";
import { NotificationItem } from "@/modules/notifications/components/notification-item";
import { ErrorState } from "@/components/common/error-state";
import type { NotificationItem as Item } from "@/modules/notifications/api/notifications";

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
  const { ready, authenticated } = useAuth();
  const unread = useUnreadCount();
  const markAll = useMarkAllRead();
  const { data, isLoading, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useNotifications();

  // 로그인 여부가 확정되기 전(!ready)에는 로그인 안내 대신 스켈레톤을 유지 — 하드 로드 시 빈 화면 플래시 방지.
  if (ready && !authenticated) {
    // 안내문만 두면 막다른 길 — 로그인으로 가는 문(돌아올 next= 포함)을 같이 내민다.
    return (
      <main className="flex flex-col items-start gap-4 px-6 py-12">
        <p className="text-slate-600 dark:text-slate-300">{t("loginRequired")}</p>
        <a
          href={`${blogHref("/login")}?next=${encodeURIComponent("/notifications")}`}
          className={blogCta({ variant: "secondary" })}
        >
          {t("loginCta")}
        </a>
      </main>
    );
  }

  const items = data?.pages.flatMap((page) => page.items) ?? [];
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t("title")}
        </h1>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            className="focus-ring rounded-md px-2 py-1 text-[13px] font-medium text-accent-700 transition-colors hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-500/10"
          >
            {t("markAllRead")}
          </button>
        )}
      </div>

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
          <div className="flex flex-col items-center py-24 text-center">
            <Bell aria-hidden className="h-6 w-6 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("empty")}</p>
          </div>
        ) : (
          GROUP_ORDER.filter((key) => groups.has(key)).map((key) => (
            <section key={key} className="mt-5 first:mt-1" aria-label={t(key)}>
              <h2 className="px-2 text-[12px] font-semibold tracking-wide text-slate-400 dark:text-slate-500">
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
