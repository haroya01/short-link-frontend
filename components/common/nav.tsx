"use client";

import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { Logo } from "@/components/common/logo";
import { cn } from "@/lib/utils";

/**
 * 로그인 후 행선지를 ?next= 로 부착. login/callback 양쪽의 ALLOWED_NEXT_PATHS 화이트리스트에 있어야 한다.
 */
function loginHrefFor(pathname: string): string {
  if (pathname.startsWith("/qr-campaigns")) return "/login?next=/links/campaigns";
  if (pathname.startsWith("/showcase")) return "/login?next=/settings/profile";
  if (pathname.startsWith("/posts")) return "/login?next=/content/write";
  return "/login";
}

type NavEntry = {
  href: string;
  label: string;
  active: (pathname: string) => boolean;
};

function anonymousEntries(t: (k: string) => string): NavEntry[] {
  return [
    { href: "/", label: t("shorten"), active: (p) => p === "/" },
    { href: "/posts", label: t("posts"), active: (p) => p.startsWith("/posts") },
    { href: "/showcase", label: t("showcase"), active: (p) => p.startsWith("/showcase") },
    { href: "/qr-campaigns", label: t("campaigns"), active: (p) => p.startsWith("/qr-campaigns") },
  ];
}

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("nav");
  const { authenticated, ready, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // 공개 프로필 페이지(u/) 는 standalone 느낌 유지 — Footer 도 같은 분기.
  if (pathname.startsWith("/u/")) return null;

  // 평면 entries 는 anonymous 만. authenticated 는 (app) 의 AppHeader 가 사이드바/영역 스위처를 처리.
  const showEntries = ready && !authenticated;
  const entries = showEntries ? anonymousEntries(t) : [];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 sm:gap-7">
          {showEntries && (
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="-ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100 sm:hidden"
              aria-label={mobileOpen ? "close menu" : "open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          )}
          <Link href="/" aria-label="kurl" className="shrink-0">
            <Logo />
          </Link>
          {showEntries && (
            <nav className="hidden items-center gap-1 sm:flex">
              {entries.map((entry) => {
                const active = entry.active(pathname);
                return (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-200 ease-out",
                      active ? "text-slate-900" : "text-slate-500 hover:text-slate-900",
                    )}
                  >
                    {entry.label}
                  </Link>
                );
              })}
            </nav>
          )}
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

      {showEntries && mobileOpen && (
        <div className="border-b border-slate-200 bg-white sm:hidden">
          <nav className="flex flex-col gap-0.5 px-3 py-3">
            {entries.map((entry) => {
              const active = entry.active(pathname);
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm transition-colors duration-200 ease-out",
                    active
                      ? "bg-accent-50 font-medium text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  {entry.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
