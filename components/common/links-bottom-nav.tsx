"use client";

import { useEffect } from "react";
import { BarChart3, CalendarDays, Contact, Ellipsis, Link2, Megaphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";

const TAB =
  "focus-ring flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors";

/**
 * Mobile-only bottom tab bar for the kurl (links) product, a distinct app from the blog (only the
 * session, via the `.kurl.me` refresh cookie, is shared). Signed in: 링크 · 분석 · 더보기 (tools,
 * settings, logout). Visitors: 단축 · QR 캠페인 · 모집 · 프로필. All tabs are locale-aware
 * same-origin Links (NOT linksHref): an absolute apex URL without the locale, e.g.
 * https://kurl.me/campaigns, is resolved as a short code on the backend apex → 404 LINK_NOT_FOUND.
 * Hidden on `sm`+ where the top Nav carries everything. Auto-hides on scroll-down.
 */
export function LinksBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname(); // locale-stripped (e.g. "/", "/dashboard", "/campaigns", "/u/..")
  const { authenticated, me } = useAuth();
  const hidden = useHideOnScroll();

  // Tell the cookie banner a bottom tab bar is present so it lifts above it (else it overlays the
  // tabs and swallows their taps). See globals.css.
  useEffect(() => {
    document.body.dataset.bottomNav = "1";
    return () => {
      delete document.body.dataset.bottomNav;
    };
  }, []);

  const username = me?.username;
  const profileHref = authenticated && username ? `/u/${username}` : "/showcase";
  const tabs = authenticated
    ? [
        {
          href: "/dashboard",
          label: t("links"),
          Icon: Link2,
          active: pathname === "/" || pathname.startsWith("/dashboard") || pathname.startsWith("/stats/"),
        },
        { href: "/analytics", label: t("analytics"), Icon: BarChart3, active: pathname.startsWith("/analytics") },
        {
          href: "/more",
          label: t("more"),
          Icon: Ellipsis,
          active:
            pathname.startsWith("/more") ||
            pathname.startsWith("/settings") ||
            pathname.startsWith("/campaigns") ||
            pathname.startsWith("/events") ||
            pathname.startsWith("/ctas"),
        },
      ]
    : [
        { href: "/", label: t("shorten"), Icon: Link2, active: pathname === "/" },
        { href: "/qr-campaigns", label: t("campaigns"), Icon: Megaphone, active: pathname.startsWith("/qr-campaigns") },
        { href: "/events", label: t("events"), Icon: CalendarDays, active: pathname.startsWith("/events") },
        { href: profileHref, label: t("profile"), Icon: Contact, active: pathname.startsWith("/u/") || pathname.startsWith("/showcase") },
      ];

  return (
    <nav
      className={cn(
        "vt-bottom-nav fixed inset-x-0 bottom-0 z-40 flex bg-white dark:bg-slate-950 border-t border-slate-200/80 pb-[env(safe-area-inset-bottom)] transition-transform duration-200 motion-reduce:transition-none dark:border-slate-800/80 sm:hidden",
        hidden && "translate-y-full",
      )}
    >
      {tabs.map(({ href, label, Icon, active }) => (
        <Link
          key={label}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(TAB, active ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400")}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
