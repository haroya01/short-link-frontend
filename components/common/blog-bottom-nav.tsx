"use client";

import { useEffect, useRef, useState } from "react";
import { Home, PenSquare, Search, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { cn } from "@/lib/utils";
import { AccountSheet } from "@/components/common/account-sheet";
import { BlogSearchSheet } from "@/components/common/blog-search-sheet";

const TAB =
  "focus-ring flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors";

/**
 * Mobile-only bottom tab bar (blog surfaces). Moves the primary actions — 홈/탐색/글쓰기/계정 — to a
 * thumb-reachable bar instead of cramming them in the top header, and shows current location. 탐색
 * (search + discovery) and account open full-width sheets. Auto-hides on scroll-down, returns on
 * scroll-up (reading space), unless reduced-motion. Hidden on `sm`+ where the desktop header carries
 * everything.
 */
export function BlogBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { authenticated } = useAuth();
  const [sheet, setSheet] = useState<null | "search" | "account">(null);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  // Tell the cookie banner a bottom tab bar is present so it lifts above it (else it overlays the
  // tabs and swallows their taps — 계정 → 로그아웃/제품 전환 unreachable). See globals.css.
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

  const isHome = sheet === null && /\/(blog-preview|blog)$/.test(pathname);

  return (
    <>
      <nav
        className={cn(
          "vt-bottom-nav fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-transform duration-200 motion-reduce:transition-none dark:border-slate-800 dark:bg-slate-950/90 sm:hidden",
          hidden && "translate-y-full",
        )}
      >
        <a
          href={blogHref("/")}
          aria-current={isHome ? "page" : undefined}
          className={cn(TAB, isHome ? "text-accent-600" : "text-slate-500")}
        >
          <Home className="h-5 w-5" />
          {t("home")}
        </a>
        <button
          type="button"
          onClick={() => setSheet("search")}
          aria-current={sheet === "search" ? "page" : undefined}
          aria-haspopup="dialog"
          className={cn(TAB, sheet === "search" ? "text-accent-600" : "text-slate-500")}
        >
          <Search className="h-5 w-5" />
          {t("explore")}
        </button>
        {authenticated && (
          <a href={blogHref("/write/new")} className={cn(TAB, "text-slate-500")}>
            <PenSquare className="h-5 w-5" />
            {t("write")}
          </a>
        )}
        <button
          type="button"
          onClick={() => setSheet("account")}
          aria-current={sheet === "account" ? "page" : undefined}
          aria-haspopup="dialog"
          className={cn(TAB, sheet === "account" ? "text-accent-600" : "text-slate-500")}
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
