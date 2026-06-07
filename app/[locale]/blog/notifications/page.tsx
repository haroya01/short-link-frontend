"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import {
  useMarkAllRead,
  useNotifications,
  useUnreadCount,
} from "@/modules/notifications/lib/use-notifications";
import { NotificationItem } from "@/modules/notifications/components/notification-item";

/**
 * Full notification feed — the mobile surface (the desktop header bell offers a dropdown peek) and a
 * deep link from "모든 알림 보기". Cursor-paginated with a 더 보기 button.
 */
export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const { ready, authenticated } = useAuth();
  const unread = useUnreadCount();
  const markAll = useMarkAllRead();
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useNotifications();

  if (!ready) return null;
  if (!authenticated) {
    return (
      <main className="px-6 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>
    );
  }

  const items = data?.pages.flatMap((page) => page.items) ?? [];

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

      <div className="mt-6">
        {isLoading ? (
          <p className="py-16 text-center text-sm text-slate-400">…</p>
        ) : items.length === 0 ? (
          <p className="py-20 text-center text-sm text-slate-400 dark:text-slate-500">
            {t("empty")}
          </p>
        ) : (
          <div className="space-y-0.5">
            {items.map((item) => (
              <NotificationItem key={item.id} item={item} />
            ))}
          </div>
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
