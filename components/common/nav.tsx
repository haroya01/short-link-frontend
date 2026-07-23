"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/common/account-menu";
import { AccountSheet } from "@/components/common/account-sheet";
import { AppsGrid } from "@/components/common/apps-grid";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { Logo } from "@/components/common/logo";
import { ThemeToggle } from "@/components/common/theme-toggle";
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
    // 로그인하면 단축한 링크 목록(대시보드)으로 가는 진입점이 상단 바에 보여야 한다 — 콜백이 로그인
    // 시작 페이지로 돌아가게 바뀐 뒤로 데스크톱에서 대시보드 가는 visible 경로가 없었다.
    { href: "/dashboard", label: t("myLinks"), active: (p) => p.startsWith("/dashboard") },
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
  const t = useTranslations("nav");
  const { authenticated, ready, me } = useAuth();
  const [sheet, setSheet] = useState(false);

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
    {/* 상시 유리 캡슐(§12) — 스크롤 상태 무관, 첫 화면부터 떠 있는 투명 카드로 보인다.
        (스크롤 시에만 캡슐화되던 2장 크로스페이드를 단일 상태로 단순화) */}
    <header className="sticky top-0 z-30">
      <div className="relative">
        <div
          aria-hidden
          className="glass-chrome absolute inset-x-3 bottom-1.5 top-1.5 mx-auto max-w-[1248px] rounded-full border border-slate-200/60 shadow-[0_8px_28px_-16px_rgba(15,23,42,0.28)] dark:border-slate-800/60"
        />
      <div className="container relative flex h-14 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 sm:gap-7">
          {/* Mobile nav lives in the bottom tab bar (LinksBottomNav) — no hamburger here. */}
          <Link href="/" aria-label="kurl" className="mark-hoverable shrink-0">
            <Logo animated />
          </Link>
          {showEntries && (
            <nav className="hidden items-center gap-1 sm:flex">
              {entries.map((entry) => {
                const active = entry.active(pathname);
                const className = cn(
                  "rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-200 ease-out",
                  active
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
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

        {/* Mobile-only top cluster — the blog↔kurl switch + the account avatar (opens the slim links
            AccountSheet). AppsGrid plays the same warp transition as desktop on the cross-product hop;
            the bottom nav carries the feature tabs. */}
        <div className="flex shrink-0 items-center gap-1.5 sm:hidden">
          <AppsGrid current="links" />
          {!ready ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          ) : authenticated ? (
            <button
              type="button"
              onClick={() => setSheet(true)}
              aria-haspopup="dialog"
              aria-label={t("account")}
              className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-100 text-[13px] font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-300"
            >
              {me?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                (me?.username || me?.email || "?").charAt(0).toUpperCase()
              )}
            </button>
          ) : (
            <>
              {/* 비로그인 모바일은 계정 시트가 없어 테마를 바꿀 곳이 여기뿐 — 데스크톱 바와 같은 이유. */}
              <ThemeToggle
                iconOnly
                className="grid h-8 w-8 place-items-center rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              />
              <Link href={loginHrefFor(pathname)}>
                <Button size="sm" variant="default">
                  {t("login")}
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Desktop-only — on mobile the blog switch + account live in the mobile cluster above.
            Signed in: the AppsGrid switch pill + the shared AccountMenu (avatar → 설정·테마·언어·
            로그아웃), the same account vocabulary blog's header uses. Settings/logout/theme/language
            live inside the menu instead of as loose bar controls; product="links" slims the menu to
            kurl's own entries (profile + blog switch stay in the top Nav / AppsGrid, not duplicated).
            Signed out: language + theme stay visible on the bar since there's no account menu yet. */}
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <AppsGrid />
          {!ready ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          ) : authenticated ? (
            <AccountMenu product="links" />
          ) : (
            <>
              <LanguageSwitcher />
              {/* kurl desktop theme toggle — signed-out visitors have no account menu, so the toggle
                  stays on the bar; without it kurl-on-desktop could only inherit the shared cookie,
                  never set it. */}
              <ThemeToggle
                iconOnly
                className="grid h-8 w-8 place-items-center rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              />
              <Link href={loginHrefFor(pathname)}>
                <Button size="sm" variant="default">
                  {t("login")}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
      </div>
    </header>
    <AccountSheet open={sheet} onClose={() => setSheet(false)} product="links" />
    </>
  );
}
