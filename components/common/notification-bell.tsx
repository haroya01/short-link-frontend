"use client";

import { useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDismiss } from "@/hooks/use-dismiss";
import { usePresence } from "@/hooks/use-presence";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { BlogChromeLink } from "@/modules/blog/components/blog-link";
import {
  useMarkAllRead,
  useNotifications,
  useReadHiddenNotices,
  useUnreadCount,
} from "@/modules/notifications/lib/use-notifications";
import { NotificationItem } from "@/modules/notifications/components/notification-item";
import { NotificationTabs } from "@/modules/notifications/components/notification-tabs";
import type { NotificationFilter } from "@/modules/notifications/api/notifications";
import { noticeHidden, useNoteFilters } from "@/modules/notes/lib/note-filters";
import { UnreadDot } from "@/components/common/unread-dot";

/**
 * Desktop header bell with an unread badge and a dropdown peek at recent notifications. Desktop only
 * (`hidden sm:block`) — on mobile the account sheet links to the full /notifications page instead, so
 * a cramped dropdown never has to work on a phone. Closes on outside-click / Escape.
 */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Hold the dropdown mounted through its dropdown-out exit (mirror of the entrance).
  const { mounted, closing } = usePresence(open, 160);
  useDismiss(open, ref, () => setOpen(false));

  const unread = useUnreadCount();

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unread > 0 ? `${t("title")}, ${t("unreadCount", { count: unread })}` : t("title")}
        className="focus-ring relative inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && <UnreadDot className="right-1 top-1" />}
      </button>

      {/* The list query lives inside the dropdown so it only fires once opened — never on mobile,
          where the bell is CSS-hidden and so can never mount this. */}
      {mounted && (
        <NotificationDropdown unread={unread} closing={closing} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

function NotificationDropdown({
  unread,
  closing,
  onClose,
}: {
  unread: number;
  closing: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const { data, isLoading, isError, isFetching, refetch } = useNotifications(filter);
  const markAll = useMarkAllRead(filter);
  const filters = useNoteFilters();
  const { me } = useAuth();
  const first = useMemo(() => data?.pages[0]?.items ?? [], [data]);
  useReadHiddenNotices(first, filters, me?.id);
  const items = first.filter((item) => !noticeHidden(item, filters, me?.id));

  return (
    <div
      role="menu"
      className={`absolute right-0 z-30 mt-2 w-80 origin-top-right overflow-hidden rounded-surface border border-slate-200 bg-white shadow-float dark:border-slate-700 dark:bg-slate-850 ${
        closing ? "animate-dropdown-out" : "animate-dropdown-in"
      }`}
    >
      <div className="flex items-center justify-between px-3 pt-2.5">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("title")}</p>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            className="focus-ring rounded text-[12px] font-medium text-accent-700 hover:text-accent-800 dark:text-accent-400"
          >
            {t("markAllRead")}
          </button>
        )}
      </div>
      <NotificationTabs value={filter} onChange={setFilter} dense className="mt-1 px-1.5" />

      <div role="tabpanel" className="max-h-96 overflow-y-auto p-1">
        {isLoading || (isError && isFetching) ? (
          // Row-shaped pulse rows (compact 3) instead of a lone "…", which read as an empty dropdown.
          <div role="status" aria-busy="true" className="space-y-1 py-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5">
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800" />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div role="alert" className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <p className="text-[13px] text-slate-500 dark:text-slate-400">{t("loadError")}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="focus-ring rounded-full px-3 py-1 text-[13px] font-medium text-accent-700 transition-colors hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-500/10"
            >
              {tc("retry")}
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="px-3 py-10 text-center text-[13px] text-slate-500 dark:text-slate-400">
            {t(filter === "mentions" ? "mentionsEmpty" : "empty")}
          </p>
        ) : (
          items.map((item) => (
            <NotificationItem key={item.id} item={item} onNavigate={onClose} />
          ))
        )}
      </div>

      <div className="h-px bg-slate-100 dark:bg-slate-800" />
      <BlogChromeLink
        href={blogHref("/notifications")}
        onClick={onClose}
        className="focus-ring block px-3 py-2.5 text-center text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
      >
        {t("viewAll")}
      </BlogChromeLink>
    </div>
  );
}
