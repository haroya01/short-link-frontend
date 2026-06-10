"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Home, PenSquare, Search, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { useUnreadCount } from "@/modules/notifications/lib/use-notifications";
import { cn } from "@/lib/utils";
import { AccountSheet } from "@/components/common/account-sheet";
import { BlogSearchSheet } from "@/components/common/blog-search-sheet";

const TAB =
  "focus-ring flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors";

/**
 * Mobile-only bottom tab bar (blog surfaces). Deliberately a DIFFERENT shape from the kurl bar (even
 * 4-tabs): a content app's centered 글쓰기 FAB (velog/brunch-style) flanked by 홈·탐색 and 알림·계정.
 * The raised accent button anchors the bar so it doesn't read empty, and makes writing the hero
 * action. 탐색/계정 open full-width sheets; 알림 carries the unread badge (mirrors the desktop bell).
 * Signed-out, the FAB + 알림 route to login. Auto-hides on scroll-down, returns on scroll-up.
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
  const writeHref = authenticated ? blogHref("/write/new") : loginHref("/write/new");
  const notifHref = authenticated ? blogHref("/notifications") : loginHref("/notifications");

  return (
    <>
      <nav
        className={cn(
          "vt-bottom-nav fixed inset-x-0 bottom-0 z-40 flex overflow-visible border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-transform duration-200 motion-reduce:transition-none dark:border-slate-800 dark:bg-slate-950/90 sm:hidden",
          hidden && "translate-y-full",
        )}
      >
        <a
          href={blogHref("/")}
          aria-current={isHome ? "page" : undefined}
          className={cn(TAB, isHome ? "text-accent-600 dark:text-accent-400" : "text-slate-500 dark:text-slate-400")}
        >
          <Home className="h-5 w-5" />
          {t("home")}
        </a>
        <button
          type="button"
          onClick={() => setSheet("search")}
          aria-current={sheet === "search" ? "page" : undefined}
          aria-haspopup="dialog"
          className={cn(TAB, sheet === "search" ? "text-accent-600 dark:text-accent-400" : "text-slate-500 dark:text-slate-400")}
        >
          <Search className="h-5 w-5" />
          {t("explore")}
        </button>

        {/* Center write FAB — raised above the bar (the content-app hero action). Icon-only; the accent
            circle + pencil reads as "write" and gives the bar a deliberate, non-empty center. */}
        <div className="flex flex-1 items-start justify-center">
          <a
            href={writeHref}
            aria-label={t("write")}
            className="focus-ring -mt-5 grid h-12 w-12 place-items-center rounded-full bg-accent-700 text-white shadow-[0_6px_16px_-4px_rgba(15,23,42,0.4)] ring-4 ring-white transition-colors hover:bg-accent-700 dark:ring-slate-950"
          >
            <PenSquare className="h-5 w-5" />
          </a>
        </div>

        <a
          href={notifHref}
          aria-current={isNotif ? "page" : undefined}
          className={cn(TAB, isNotif ? "text-accent-600 dark:text-accent-400" : "text-slate-500 dark:text-slate-400")}
        >
          <span className="relative">
            <Bell className="h-5 w-5" />
            {authenticated && unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent-700 px-1 text-[10px] font-bold leading-none text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </span>
          {tNotif("title")}
        </a>
        <button
          type="button"
          onClick={() => setSheet("account")}
          aria-current={sheet === "account" ? "page" : undefined}
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
