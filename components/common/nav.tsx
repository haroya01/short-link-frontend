"use client";

import { useEffect, useState } from "react";
import { LogOut, Menu, Settings, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AppsGrid } from "@/components/common/apps-grid";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { Logo } from "@/components/common/logo";
import { cn } from "@/lib/utils";

/**
 * 로그인 후 행선지를 ?next= 로 부착. login/callback 양쪽의 ALLOWED_NEXT_PATHS 화이트리스트에 있어야 한다.
 */
function loginHrefFor(pathname: string): string {
  if (pathname.startsWith("/qr-campaigns")) return "/login?next=/campaigns";
  if (pathname.startsWith("/showcase")) return "/login?next=/settings/profile";
  return "/login";
}

type NavEntry = {
  href: string;
  label: string;
  active: (pathname: string) => boolean;
  /** Cross-host link (e.g. the blog subdomain) — rendered as a plain <a>, not a locale Link. */
  external?: boolean;
};

// Single 3-entry bar: 숏링크 / QR캠페인 / 프로필. Blog is reached via the AppsGrid destination pill.
function anonymousEntries(t: (k: string) => string): NavEntry[] {
  return [
    { href: "/", label: t("shorten"), active: (p) => p === "/" },
    { href: "/qr-campaigns", label: t("campaigns"), active: (p) => p.startsWith("/qr-campaigns") },
    { href: "/showcase", label: t("showcase"), active: (p) => p.startsWith("/showcase") },
  ];
}

function authenticatedEntries(t: (k: string) => string, hasProfile: boolean): NavEntry[] {
  // Profile owner → edit settings; no profile yet → showcase (examples / onboarding).
  const profileHref = hasProfile ? "/settings/profile" : "/showcase";
  return [
    { href: "/", label: t("shorten"), active: (p) => p === "/" },
    { href: "/campaigns", label: t("campaigns"), active: (p) => p.startsWith("/campaigns") },
    {
      href: profileHref,
      label: t("profile"),
      active: (p) => p.startsWith("/settings/profile") || p.startsWith("/showcase"),
    },
  ];
}

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("nav");
  const { authenticated, ready, signOut, me } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Drawer open: lock body scroll behind the overlay + close on Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  // 공개 프로필 페이지(u/) 는 standalone 느낌 유지 — Footer 도 같은 분기.
  if (pathname.startsWith("/u/")) return null;

  // 단일 상단 가로바 IA: 로그인 여부에 따라 entries 만 교체. (사이드바 IA 폐기 — kurl.me 는 top-nav)
  const showEntries = ready;
  const entries = !ready
    ? []
    : authenticated
      ? authenticatedEntries(t, Boolean(me?.username))
      : anonymousEntries(t);

  return (
    <>
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 sm:gap-7">
          {showEntries && (
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="-ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100 sm:hidden"
              aria-label="open menu"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
          <Link href="/" aria-label="kurl" className="shrink-0">
            <Logo />
          </Link>
          {showEntries && (
            <nav className="hidden items-center gap-1 sm:flex">
              {entries.map((entry) => {
                const active = entry.active(pathname);
                const className = cn(
                  "rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-200 ease-out",
                  active ? "text-slate-900" : "text-slate-500 hover:text-slate-900",
                );
                return entry.external ? (
                  <a key={entry.href} href={entry.href} className={className}>
                    {entry.label}
                  </a>
                ) : (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    aria-current={active ? "page" : undefined}
                    className={className}
                  >
                    {entry.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <AppsGrid />
          <LanguageSwitcher />
          {!ready ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-slate-100" />
          ) : authenticated ? (
            <>
              <Link
                href="/settings"
                aria-label={t("settings")}
                className="grid h-8 w-8 place-items-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <Settings className="h-4 w-4" />
              </Link>
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
            </>
          ) : (
            <Link href={loginHrefFor(pathname)}>
              <Button size="sm" variant="default">
                {t("login")}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>

      {/* Mobile menu = left-edge slide-in drawer (not a top accordion). Rendered OUTSIDE the
          <header> on purpose: the header's `backdrop-blur` establishes a containing block for
          `position: fixed` descendants, which would pin `inset-y-0` to the 56px header box
          instead of the viewport (drawer collapses to header height). As a sibling it positions
          against the viewport. Both backdrop and panel stay mounted so they transition;
          pointer-events/translate toggle on `mobileOpen`. */}
      {showEntries && (
        <div className="sm:hidden" aria-hidden={!mobileOpen}>
          <button
            type="button"
            tabIndex={mobileOpen ? 0 : -1}
            aria-label="close menu"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ease-out",
              mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          />
          <div
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col bg-white shadow-xl transition-transform duration-300 ease-out",
              mobileOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="close menu"
                className="-mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
              {entries.map((entry) => {
                const active = entry.active(pathname);
                const className = cn(
                  "rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 ease-out",
                  active
                    ? "bg-accent-50 font-medium text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                );
                return entry.external ? (
                  <a
                    key={entry.href}
                    href={entry.href}
                    onClick={() => setMobileOpen(false)}
                    className={className}
                  >
                    {entry.label}
                  </a>
                ) : (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={className}
                  >
                    {entry.label}
                  </Link>
                );
              })}
              {authenticated && (
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors duration-200 ease-out hover:bg-slate-50 hover:text-slate-900"
                >
                  {t("settings")}
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
