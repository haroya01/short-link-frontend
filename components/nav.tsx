"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// `useLayoutEffect` runs on the server too (React stubs it as a no-op) and prints a noisy
// warning in development. Fall back to `useEffect` during SSR; the indicator stays opacity-0
// until the first client measurement so the swap is invisible. Pattern lifted from React docs +
// react-redux's `useIsomorphicLayoutEffect`.
/**
 * 로그인 버튼이 가는 /login URL — 현재 페이지에 따라 ?next= 부착해서 로그인 후 자연스러운
 * 행선지로. 페이지에 명시적 의도가 없으면 그냥 /login (callback 의 default /dashboard).
 * pathname 은 i18n usePathname() 결과라 이미 locale prefix 없음.
 *
 * next 행선지는 login/callback 양쪽의 ALLOWED_NEXT_PATHS 화이트리스트에 있어야 함.
 */
function loginHrefFor(pathname: string): string {
  if (pathname.startsWith("/qr-campaigns")) return "/login?next=/campaigns";
  if (pathname.startsWith("/showcase")) return "/login?next=/profile/edit";
  return "/login";
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
import { LogOut, Menu, X } from "lucide-react";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "./ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

type NavEntry = {
  href: string;
  label: string;
  /** Matcher receives the current pathname and decides whether the tab is the active one. */
  active: (pathname: string) => boolean;
};

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("nav");
  const { authenticated, ready, isAdmin, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Public profile pages render without site chrome — they're meant to feel like a standalone
  // bio link, the way Linktree pages do. Same logic in <Footer>. Must come AFTER all hooks per
  // React rules-of-hooks.
  if (pathname.startsWith("/u/")) return null;

  /*
   * Single source of truth for desktop + mobile entries. Compose dynamically based on auth /
   * admin state so the floating-accent indicator and the mobile drawer both render the same
   * label set without drift — every time we used to add an item to the desktop nav we had to
   * remember to mirror it in the mobile branch, and the two slid apart on /profile/edit.
   */
  const entries: NavEntry[] = [
    { href: "/", label: t("shorten"), active: (p) => p === "/" },
  ];
  if (authenticated) {
    entries.push({
      href: "/profile/edit",
      label: t("profile"),
      active: (p) => p === "/profile/edit" || p === "/profile/stats",
    });
  } else {
    entries.push({
      href: "/showcase",
      label: t("showcase"),
      active: (p) => p.startsWith("/showcase"),
    });
  }
  if (authenticated) {
    entries.push({
      href: "/dashboard",
      label: t("myLinks"),
      active: (p) => p.startsWith("/dashboard"),
    });
  }
  // QR 캠페인 메뉴는 anonymous + 로그인 모두 노출 — anonymous 는 marketing landing,
  // 로그인 사용자는 자기 캠페인 목록. 도메인이 일반 단축 URL 과 다르다는 걸 진입에서 분리.
  entries.push({
    href: authenticated ? "/campaigns" : "/qr-campaigns",
    label: t("campaigns"),
    active: (p) => p.startsWith("/campaigns") || p.startsWith("/qr-campaigns"),
  });
  if (isAdmin) {
    entries.push({
      href: "/admin",
      label: t("admin"),
      active: (p) => p.startsWith("/admin"),
    });
  }
  if (authenticated) {
    entries.push({
      href: "/settings",
      label: t("settings"),
      active: (p) => p.startsWith("/settings"),
    });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 sm:gap-7">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="-ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100 sm:hidden"
            aria-label={mobileOpen ? "close menu" : "open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <Link href="/" aria-label="kurl" className="shrink-0">
            <Logo />
          </Link>
          <DesktopNav entries={entries} pathname={pathname} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          {!ready ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-slate-100" />
          ) : authenticated ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                router.push(`/${locale}`);
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </Button>
          ) : (
            <Link href={loginHrefFor(pathname)}>
              <Button size="sm" variant="default">
                {t("login")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <MobileDrawer
        open={mobileOpen}
        entries={entries}
        pathname={pathname}
        onClose={() => setMobileOpen(false)}
        drawerRef={mobileRef}
      />
    </header>
  );
}

/*
 * Desktop nav with a floating accent indicator. Restrained, text-only — no icons next to labels
 * (we tried that and the icons piled on AI-template visual weight that the AGENTS.md "luxury /
 * refined" direction explicitly avoids). The indicator is a single 1.5 px accent bar that slides
 * between active tabs, so the dynamism comes from one element moving rather than every link
 * decorating itself. The bar position/width is measured from the rendered <a> elements so we
 * don't have to hard-code link widths (which would break in JA / EN where the label widths shift
 * vs. the KO baseline).
 */
function DesktopNav({
  entries,
  pathname,
}: {
  entries: NavEntry[];
  pathname: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  const activeIndex = entries.findIndex((e) => e.active(pathname));

  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    const el = activeIndex >= 0 ? itemRefs.current[activeIndex] : null;
    if (!list || !el) {
      setIndicator(null);
      return;
    }
    const listRect = list.getBoundingClientRect();
    const itemRect = el.getBoundingClientRect();
    setIndicator({ left: itemRect.left - listRect.left, width: itemRect.width });
  }, [pathname, activeIndex, entries.length]);

  // Re-measure on viewport resize + on the list's own resize (font subset loads, locale changes
  // that swap KO ↔ EN ↔ JA label widths, container width breakpoints). Without ResizeObserver
  // the indicator stuck to the pre-Pretendard measurement on cold loads — the served fallback
  // (system sans) is ~6 px narrower per CJK glyph than Pretendard Variable.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const measure = () => {
      const list = listRef.current;
      const el = activeIndex >= 0 ? itemRefs.current[activeIndex] : null;
      if (!list || !el) return;
      const listRect = list.getBoundingClientRect();
      const itemRect = el.getBoundingClientRect();
      setIndicator({ left: itemRect.left - listRect.left, width: itemRect.width });
    };
    window.addEventListener("resize", measure);
    const list = listRef.current;
    let ro: ResizeObserver | undefined;
    if (list && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(list);
    }
    return () => {
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [activeIndex]);

  return (
    <div ref={listRef} className="relative hidden items-center sm:flex">
      <nav className="flex items-center gap-1">
        {entries.map((entry, i) => (
          <Link
            key={entry.href}
            href={entry.href}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            aria-current={entry.active(pathname) ? "page" : undefined}
            className={cn(
              "relative px-2.5 py-1.5 text-[13px] font-medium transition-colors",
              entry.active(pathname)
                ? "text-slate-900"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            {entry.label}
          </Link>
        ))}
      </nav>
      {/* Floating accent indicator — single 1.5px bar that slides between active tabs.
          Off-screen (opacity 0) until the first measurement so we don't flash at left:0 on mount. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-[-13px] h-px bg-accent-600",
          "transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          indicator ? "opacity-100" : "opacity-0",
        )}
        style={
          indicator
            ? { left: indicator.left, width: indicator.width }
            : { left: 0, width: 0 }
        }
      />
    </div>
  );
}

/*
 * Mobile drawer — slides in from the left with a backdrop. Single render path (CSS transform
 * driven) so we can keep the drawer in the DOM and animate open/close without unmount jitter.
 * Body scroll is locked while open; Escape and outside-click both dismiss.
 */
function MobileDrawer({
  open,
  entries,
  pathname,
  onClose,
  drawerRef,
}: {
  open: boolean;
  entries: NavEntry[];
  pathname: string;
  onClose: () => void;
  drawerRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 top-14 z-20 bg-slate-900/20 backdrop-blur-[2px] transition-opacity duration-200 sm:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="navigation"
        className={cn(
          "fixed left-0 top-14 z-20 h-[calc(100vh-3.5rem)] w-72 max-w-[80vw] border-r border-slate-200 bg-white shadow-xl transition-transform duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] sm:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <nav className="flex flex-col gap-0.5 px-3 py-4">
          {entries.map((entry) => {
            const active = entry.active(pathname);
            return (
              <Link
                key={entry.href}
                href={entry.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-accent-50 font-medium text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                {/* Inline accent bar on the active item — mirrors the desktop indicator language
                    so the design vocabulary stays consistent across breakpoints. */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-accent-600"
                  />
                )}
                {entry.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
