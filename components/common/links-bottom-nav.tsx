"use client";

import { useEffect, useRef, useState } from "react";
import { Home, Megaphone, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { linksHref } from "@/lib/host";
import { cn } from "@/lib/utils";
import { AccountSheet } from "@/components/common/account-sheet";

const TAB =
  "focus-ring flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors";

/**
 * Mobile-only bottom tab bar for the kurl (links) product — mirrors the blog's, so the two products
 * feel like one app on a phone. The 계정 tab opens the shared AccountSheet, which carries the
 * profile + the kurl↔blog switch + sign out (the cross-product hop the links top-nav lacked). Hidden
 * on `sm`+ where the top Nav carries everything. Auto-hides on scroll-down.
 */
export function LinksBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
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

  const isHome = !sheet && /^\/[a-z]{2}(\/links)?$/.test(pathname);

  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-transform duration-200 motion-reduce:transition-none sm:hidden",
          hidden && "translate-y-full",
        )}
      >
        <a
          href={linksHref("/")}
          aria-current={isHome ? "page" : undefined}
          className={cn(TAB, isHome ? "text-accent-600" : "text-slate-500")}
        >
          <Home className="h-5 w-5" />
          {t("home")}
        </a>
        <a href={linksHref("/campaigns")} className={cn(TAB, "text-slate-500")}>
          <Megaphone className="h-5 w-5" />
          {t("campaigns")}
        </a>
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
