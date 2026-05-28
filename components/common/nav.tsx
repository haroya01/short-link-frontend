"use client";

import { LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { Logo } from "@/components/common/logo";

/**
 * 로그인 후 행선지를 ?next= 로 부착. login/callback 양쪽의 ALLOWED_NEXT_PATHS 화이트리스트에 있어야 한다.
 */
function loginHrefFor(pathname: string): string {
  if (pathname.startsWith("/qr-campaigns")) return "/login?next=/links/campaigns";
  if (pathname.startsWith("/showcase")) return "/login?next=/settings/profile";
  return "/login";
}

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("nav");
  const { authenticated, ready, signOut } = useAuth();

  // 공개 프로필 페이지(u/) 는 standalone 느낌 유지 — Footer 도 같은 분기.
  if (pathname.startsWith("/u/")) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-2">
        <Link href="/" aria-label="kurl" className="shrink-0">
          <Logo />
        </Link>

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
    </header>
  );
}
