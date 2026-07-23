"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Home, Search, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { BlogChromeLink } from "@/modules/blog/components/blog-link";
import { useUnreadCount } from "@/modules/notifications/lib/use-notifications";
import { cn } from "@/lib/utils";
import { AccountSheet } from "@/components/common/account-sheet";
import { BlogSearchSheet } from "@/components/common/blog-search-sheet";

const TAB =
  "focus-ring flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors";

/**
 * Mobile-only bottom tab bar (blog surfaces). Four tabs: 홈 · 탐색 · 알림 · 계정. 탐색/계정 open
 * full-width sheets; 홈/알림 navigate. 알림 carries the unread badge (mirrors the desktop bell).
 * Signed-out, 알림/계정 route to login. Auto-hides on scroll-down, returns on scroll-up.
 */
export function BlogBottomNav() {
  const t = useTranslations("nav");
  const tNotif = useTranslations("notifications");
  const pathname = usePathname();
  const { authenticated } = useAuth();
  const unread = useUnreadCount();
  const [sheet, setSheet] = useState<null | "search" | "account">(null);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  // Tell the cookie banner a bottom tab bar is present so it lifts above it (else it overlays the
  // tabs and swallows their taps). See globals.css.
  useEffect(() => {
    document.body.dataset.bottomNav = "1";
    return () => {
      delete document.body.dataset.bottomNav;
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    function onScroll() {
      const y = window.scrollY;
      if (y > lastY.current + 8 && y > 80) setHidden(true);
      else if (y < lastY.current - 8) setHidden(false);
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Locale-anchored so 홈 highlights on both topologies: production subdomain (pathname = `/ko`) and
  // dev/preview path (`/ko/blog`, `/ko/blog-preview`).
  const isHome = sheet === null && /^\/[a-z]{2}(\/(blog|blog-preview))?\/?$/.test(pathname);
  const isNotif = sheet === null && /\/notifications(\/|$)/.test(pathname);
  // Signed-out → kurl's branded login (then Google), carrying where they wanted to go.
  const loginHref = (next: string) => `${blogHref("/login")}?next=${encodeURIComponent(next)}`;
  const notifHref = authenticated ? blogHref("/notifications") : loginHref("/notifications");

  return (
    <>
      <nav
        className={cn(
          "vt-bottom-nav glass-chrome fixed inset-x-0 bottom-0 z-40 flex overflow-visible border-t border-slate-200/60 pb-[env(safe-area-inset-bottom)] transition-transform duration-200 motion-reduce:transition-none dark:border-slate-800/60 sm:hidden",
          hidden && "translate-y-full",
        )}
      >
        <BlogChromeLink
          href={blogHref("/")}
          aria-current={isHome ? "page" : undefined}
          className={cn(TAB, isHome ? "text-accent-600 dark:text-accent-400" : "text-slate-500 dark:text-slate-400")}
        >
          <Home className="h-5 w-5" />
          {t("home")}
        </BlogChromeLink>
        <button
          type="button"
          onClick={() => setSheet("search")}
          aria-expanded={sheet === "search"}
          aria-haspopup="dialog"
          className={cn(TAB, sheet === "search" ? "text-accent-600 dark:text-accent-400" : "text-slate-500 dark:text-slate-400")}
        >
          <Search className="h-5 w-5" />
          {t("explore")}
        </button>

        <BlogChromeLink
          href={notifHref}
          aria-current={isNotif ? "page" : undefined}
          // Fold the unread count into the tab's name so a screen reader announces it — the numeric badge
          // is otherwise decorative (aria-hidden) and silent.
          aria-label={authenticated && unread > 0 ? `${tNotif("title")}, ${tNotif("unreadCount", { count: unread })}` : undefined}
          className={cn(TAB, isNotif ? "text-accent-600 dark:text-accent-400" : "text-slate-500 dark:text-slate-400")}
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
          className={cn(TAB, sheet === "account" ? "text-accent-600 dark:text-accent-400" : "text-slate-500 dark:text-slate-400")}
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
