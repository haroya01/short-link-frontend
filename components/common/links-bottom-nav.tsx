"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, Contact, Link2, Megaphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TAB =
  "focus-ring flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors";

/**
 * Mobile-only bottom tab bar for the kurl (links) product. The tabs map to kurl's own features —
 * 단축(shortener) · 캠페인(QR) · 통계(short-link dashboard) · 프로필(online business card) — so it reads
 * as a distinct app from the blog (only the session, via the `.kurl.me` refresh cookie, is shared).
 * Account + the blog↔kurl switch live in the top Nav on mobile, not here. All tabs are locale-aware
 * same-origin Links (NOT linksHref): an absolute apex URL without the locale, e.g.
 * https://kurl.me/campaigns, is resolved as a short code on the backend apex → 404 LINK_NOT_FOUND.
 * Hidden on `sm`+ where the top Nav carries everything. Auto-hides on scroll-down.
 */
export function LinksBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname(); // locale-stripped (e.g. "/", "/dashboard", "/campaigns", "/u/..")
  const { authenticated, me } = useAuth();
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

  // 단축: the shortener home. 캠페인: the app (authed) or its landing (anon). 통계: the short-link
  // dashboard (내 링크 + 클릭수 + 주간 인사이트) — kurl's stats hub, NOT the blog post analytics.
  // 프로필: view the public online business card (or showcase onboarding when there's no card yet).
  const username = me?.username;
  const profileHref = authenticated && username ? `/u/${username}` : "/showcase";
  const tabs = [
    { href: "/", label: t("shorten"), Icon: Link2, active: pathname === "/" },
    {
      href: authenticated ? "/campaigns" : "/qr-campaigns",
      label: t("campaigns"),
      Icon: Megaphone,
      active: pathname.startsWith("/campaigns") || pathname.startsWith("/qr-campaigns"),
    },
    {
      href: "/dashboard",
      label: t("stats"),
      Icon: BarChart3,
      active: pathname.startsWith("/dashboard"),
    },
    {
      href: profileHref,
      label: t("profile"),
      Icon: Contact,
      active:
        pathname.startsWith("/u/") ||
        pathname.startsWith("/showcase") ||
        pathname.startsWith("/settings/profile"),
    },
  ];

  return (
    <nav
      className={cn(
        "glass-chrome fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200/60 pb-[env(safe-area-inset-bottom)] transition-transform duration-200 motion-reduce:transition-none dark:border-slate-800/60 sm:hidden",
        hidden && "translate-y-full",
      )}
    >
      {tabs.map(({ href, label, Icon, active }) => (
        <Link
          key={label}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(TAB, active ? "text-accent-600 dark:text-accent-400" : "text-slate-500 dark:text-slate-400")}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
