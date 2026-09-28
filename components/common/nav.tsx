"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link, usePathname } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { AccountMenu } from "@/components/common/account-menu";
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
  if (pathname.startsWith("/events")) return "/login?next=/events";
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
    { href: "/events", label: t("events"), active: (p) => p.startsWith("/events") },
    { href: "/showcase", label: t("showcase"), active: (p) => p.startsWith("/showcase") },
  ];
}

function authenticatedEntries(t: (k: string) => string): NavEntry[] {
  return [
    {
      href: "/dashboard",
      label: t("links"),
      active: (p) => p === "/" || p.startsWith("/dashboard") || p.startsWith("/stats/"),
    },
    { href: "/analytics", label: t("analytics"), active: (p) => p.startsWith("/analytics") },
    {
      href: "/settings",
      label: t("account"),
      active: (p) =>
        p.startsWith("/settings") || p.startsWith("/campaigns") || p.startsWith("/events") || p.startsWith("/ctas"),
    },
  ];
}

export function Nav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { authenticated, ready } = useAuth();

  // 공개 프로필 페이지(u/) 는 standalone 느낌 유지 — Footer 도 같은 분기.
  if (pathname.startsWith("/u/")) return null;

  // 단일 상단 가로바 IA: 로그인 여부에 따라 entries 만 교체. (사이드바 IA 폐기 — kurl.me 는 top-nav)
  const showEntries = ready;
  const entries = !ready
    ? []
    : authenticated
      ? authenticatedEntries(t)
      : anonymousEntries(t);

  return (
    <>
    <header className="vt-app-header sticky top-0 z-30">
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 border-b border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-950"
        />
      <div className="container relative flex h-14 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 sm:gap-7">
          {/* Mobile nav lives in the bottom tab bar (LinksBottomNav) — no hamburger here. */}
          {/* 360px 미만에선 마크만. 풀 워드마크를 두면 우측 "blog.kurl" 필과 겹쳐 워드마크의 l 이
              가려졌다(320 에서 4px). 여백을 넓히면 그 겹침이 더 커지므로 같이 처리한다. 블로그
              헤더가 이미 같은 방식(<sm 마크만)이라 문법도 어긋나지 않는다. */}
          <Link href="/" aria-label="kurl" className="mark-hoverable shrink-0">
            <Logo animated showText={false} className="min-[360px]:hidden" />
            <Logo animated className="hidden min-[360px]:inline-flex" />
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

        {/* Mobile-only top cluster — the blog↔kurl switch, plus theme + login for visitors. Signed in,
            the bottom nav's 계정 tab is the account surface (settings, theme, language, logout). */}
        <div className="flex shrink-0 items-center gap-1.5 sm:hidden">
          <AppsGrid current="links" />
          {(!ready || !authenticated) && (
            <div data-auth-slot={ready ? undefined : "anon"} className="contents">
              <ThemeToggle
                iconOnly
                className="grid h-8 w-8 place-items-center rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              />
              <Link href={loginHrefFor(pathname)} className={buttonVariants({ size: "sm", variant: "outline" })}>
                {t("login")}
              </Link>
            </div>
          )}
        </div>

        {/* Desktop-only — on mobile the blog switch + account live in the mobile cluster above.
            Signed in: the AppsGrid switch pill + the shared AccountMenu (avatar → 설정·테마·언어·
            로그아웃), the same account vocabulary blog's header uses. Settings/logout/theme/language
            live inside the menu instead of as loose bar controls; product="links" slims the menu to
            kurl's own entries (profile + blog switch stay in the top Nav / AppsGrid, not duplicated).
            Signed out: language + theme stay visible on the bar since there's no account menu yet. */}
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <AppsGrid current="links" />
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
              <Link href={loginHrefFor(pathname)} className={buttonVariants({ size: "sm", variant: "outline" })}>
                {t("login")}
              </Link>
            </>
          )}
        </div>
      </div>
      </div>
    </header>
    </>
  );
}
