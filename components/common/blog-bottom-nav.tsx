"use client";

import { useEffect, useState } from "react";
import { Bell, Home, MessageSquareText, Search, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { BlogChromeLink } from "@/modules/blog/components/blog-link";
import { useUnreadCount } from "@/modules/notifications/lib/use-notifications";
import { cn } from "@/lib/utils";
import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";
import { AccountSheet } from "@/components/common/account-sheet";
import { BlogSearchSheet } from "@/components/common/blog-search-sheet";

const TAB =
  "focus-ring flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors";

/**
 * Mobile-only bottom tab bar (blog surfaces). Five tabs: 홈 · 노트 · 검색 · 알림 · 계정. 검색/계정 open
 * full-width sheets; 홈/노트/알림 navigate. 알림 carries the unread badge (mirrors the desktop bell).
 * Signed-out, 알림/계정 route to login. Auto-hides on scroll-down, returns on scroll-up.
 */
export function BlogBottomNav() {
  const t = useTranslations("nav");
  const tNotif = useTranslations("notifications");
  const pathname = usePathname();
  const { authenticated } = useAuth();
  const unread = useUnreadCount();
  const [sheet, setSheet] = useState<null | "search" | "account">(null);
  const hidden = useHideOnScroll();

  // Tell the cookie banner a bottom tab bar is present so it lifts above it (else it overlays the
  // tabs and swallows their taps). See globals.css.
  useEffect(() => {
    document.body.dataset.bottomNav = "1";
    return () => {
      delete document.body.dataset.bottomNav;
    };
  }, []);

  // Locale optional: the blog host rewrites a no-locale entry in place (pathname `/`, `/notes`), and
  // also serves `/ko`; dev/preview paths are `/ko/blog`, `/ko/blog-preview`.
  const isHome = sheet === null && /^(\/[a-z]{2})?(\/(blog|blog-preview))?\/?$/.test(pathname);
  const isNotes = sheet === null && /^(\/[a-z]{2})?(\/(blog|blog-preview))?\/notes\/?$/.test(pathname);
  const isNotif = sheet === null && /\/notifications(\/|$)/.test(pathname);

  return (
    <>
      <nav
        className={cn(
          "vt-bottom-nav fixed inset-x-0 bottom-0 z-40 flex bg-white dark:bg-slate-950 overflow-visible border-t border-slate-200/80 pb-[env(safe-area-inset-bottom)] transition-transform duration-200 motion-reduce:transition-none dark:border-slate-800/80 sm:hidden",
          hidden && "translate-y-full",
        )}
      >
        <BlogChromeLink
          href={blogHref("/")}
          aria-current={isHome ? "page" : undefined}
          className={cn(TAB, isHome ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400")}
        >
          <Home className="h-5 w-5" />
          {t("home")}
        </BlogChromeLink>
        <BlogChromeLink
          href={blogHref("/notes")}
          aria-current={isNotes ? "page" : undefined}
          className={cn(TAB, isNotes ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400")}
        >
          <MessageSquareText className="h-5 w-5" />
          {t("notes")}
        </BlogChromeLink>
        <button
          type="button"
          onClick={() => setSheet("search")}
          aria-expanded={sheet === "search"}
          aria-haspopup="dialog"
          className={cn(TAB, sheet === "search" ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400")}
        >
          <Search className="h-5 w-5" />
          {t("search")}
        </button>

        <BlogChromeLink
          href={blogHref("/notifications")}
          aria-current={isNotif ? "page" : undefined}
          // Fold the unread count into the tab's name so a screen reader announces it — the numeric badge
          // is otherwise decorative (aria-hidden) and silent.
          aria-label={authenticated && unread > 0 ? `${tNotif("title")}, ${tNotif("unreadCount", { count: unread })}` : undefined}
          className={cn(TAB, isNotif ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400")}
        >
          <span className="relative">
            <Bell className="h-5 w-5" />
            {authenticated && unread > 0 && (
              <span
                aria-hidden
                className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent-700 px-1 text-[10px] font-bold leading-none text-white"
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </span>
          {tNotif("title")}
        </BlogChromeLink>
        <button
          type="button"
          onClick={() => setSheet("account")}
          aria-expanded={sheet === "account"}
          aria-haspopup="dialog"
          className={cn(TAB, sheet === "account" ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400")}
        >
          <User className="h-5 w-5" />
          {authenticated ? t("account") : t("login")}
        </button>
      </nav>

      <BlogSearchSheet open={sheet === "search"} onClose={() => setSheet(null)} />
      <AccountSheet open={sheet === "account"} onClose={() => setSheet(null)} />
    </>
  );
}
