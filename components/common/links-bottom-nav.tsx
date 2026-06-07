"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, Link2, Megaphone, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { AccountSheet } from "@/components/common/account-sheet";

const TAB =
  "focus-ring flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors";

/**
 * Mobile-only bottom tab bar for the kurl (links) product. Unlike the blog's nav, the tabs map to
 * kurl's own features — 단축(shortener) · 캠페인(QR) · 통계(stats) · 계정 — so the two products read as
 * distinct apps on a phone (only the session, via the `.kurl.me` refresh cookie, is shared). All tabs
 * are locale-aware same-origin Links (NOT linksHref): an absolute apex URL without the locale, e.g.
 * https://kurl.me/campaigns, gets resolved as a short code on the backend apex → 404 LINK_NOT_FOUND.
 * The 계정 tab opens the shared AccountSheet (profile + kurl↔blog switch + sign out). Hidden on `sm`+
 * where the top Nav carries everything. Auto-hides on scroll-down.
 */
export function LinksBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname(); // locale-stripped (e.g. "/", "/dashboard", "/campaigns", "/stats")
  const { authenticated } = useAuth();
  const [sheet, setSheet] = useState(false);
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

  const tab = (active: boolean) =>
    cn(TAB, !sheet && active ? "text-accent-600" : "text-slate-500");
  // 단축: the shortener home + the "내 링크" dashboard. 캠페인: the app (authed) or its landing (anon).
  const shortenActive = pathname === "/" || pathname.startsWith("/dashboard");
  const campaignsActive =
    pathname.startsWith("/campaigns") || pathname.startsWith("/qr-campaigns");
  const statsActive = pathname.startsWith("/stats");

  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-transform duration-200 motion-reduce:transition-none sm:hidden",
          hidden && "translate-y-full",
        )}
      >
        <Link
          href="/"
          aria-current={shortenActive && !sheet ? "page" : undefined}
          className={tab(shortenActive)}
        >
          <Link2 className="h-5 w-5" />
          {t("shorten")}
        </Link>
        <Link
          href={authenticated ? "/campaigns" : "/qr-campaigns"}
          aria-current={campaignsActive && !sheet ? "page" : undefined}
          className={tab(campaignsActive)}
        >
          <Megaphone className="h-5 w-5" />
          {t("campaigns")}
        </Link>
        <Link
          href="/stats"
          aria-current={statsActive && !sheet ? "page" : undefined}
          className={tab(statsActive)}
        >
          <BarChart3 className="h-5 w-5" />
          {t("stats")}
        </Link>
        <button
          type="button"
          onClick={() => setSheet(true)}
          aria-current={sheet ? "page" : undefined}
          aria-haspopup="dialog"
          className={cn(TAB, sheet ? "text-accent-600" : "text-slate-500")}
        >
          <User className="h-5 w-5" />
          {authenticated ? t("account") : t("login")}
        </button>
      </nav>

      <AccountSheet open={sheet} onClose={() => setSheet(false)} />
    </>
  );
}
