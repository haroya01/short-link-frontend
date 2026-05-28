"use client";

import { Eye, LogOut, Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AreaSwitcher } from "@/components/common/area-switcher";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { Logo } from "@/components/common/logo";
import { useSidebarState } from "@/components/common/sidebar-state";

export function AppHeader() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("nav");
  const { me, signOut } = useAuth();
  const { open, toggle } = useSidebarState();

  const username = me?.username ?? null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={toggle}
            className="-ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100 sm:hidden"
            aria-label={open ? "close menu" : "open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <Link href="/" aria-label="kurl" className="shrink-0">
            <Logo />
          </Link>
          <AreaSwitcher />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {username && (
            <a
              href={`/p/${username}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("viewMyPage")}</span>
            </a>
          )}
          <LanguageSwitcher />
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
        </div>
      </div>
    </header>
  );
}
