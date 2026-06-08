"use client";

import { useState } from "react";
import { LogOut, Settings } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AccountSheet } from "@/components/common/account-sheet";
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
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-2">
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

        {/* Mobile-only top cluster — the blog↔kurl switch + the account avatar (opens the slim links
            AccountSheet). AppsGrid plays the same warp transition as desktop on the cross-product hop;
            the bottom nav carries the feature tabs. */}
        <div className="flex shrink-0 items-center gap-1.5 sm:hidden">
          <AppsGrid current="links" />
          {!ready ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
          ) : authenticated ? (
            <button
              type="button"
              onClick={() => setSheet(true)}
              aria-haspopup="dialog"
              aria-label={t("account")}
              className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-100 text-[13px] font-semibold text-accent-700"
            >
              {me?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                (me?.username || me?.email || "?").charAt(0).toUpperCase()
              )}
            </button>
          ) : (
            <Link href={loginHrefFor(pathname)}>
              <Button size="sm" variant="default">
                {t("login")}
              </Button>
            </Link>
          )}
        </div>

        {/* Desktop-only — on mobile the blog switch + account live in the mobile cluster above. */}
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
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
    <AccountSheet open={sheet} onClose={() => setSheet(false)} product="links" />
    </>
  );
}
