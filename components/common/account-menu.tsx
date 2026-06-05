"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, Check, ChevronDown, Globe, LogOut, Newspaper, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { usePathname, useRouter as useIntlRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useAuth } from "@/lib/auth";
import { useDismiss } from "@/hooks/use-dismiss";
import { cacheMeAvatar, cacheMeInitial } from "@/components/common/header-avatar-slot";
import { blogHref, linksHref } from "@/lib/host";
import { authorHref } from "@/modules/blog/components/feed-card";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { cn } from "@/lib/utils";

/**
 * Signed-in account control. An avatar button (the viewer's initial — `Me` carries no photo) opens a
 * dropdown that gathers everything personal in one place: the viewer's two public surfaces (블로그 /
 * 프로필 — separate products, shared identity), language, and sign out. Keeps "sign out" off the bar
 * and consolidates the surface-level controls, Google/Naver style; the cross-product app switcher
 * (AppsGrid) stays a separate control. Closes on outside-click or Escape.
 */
export function AccountMenu() {
  const t = useTranslations("nav");
  const tLang = useTranslations("languageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const intlRouter = useIntlRouter();
  const pathname = usePathname();
  const { me, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useDismiss(open, ref, () => setOpen(false));

  // Collapse the language picker whenever the whole menu closes, so it reopens compact.
  useEffect(() => {
    if (!open) setLangOpen(false);
  }, [open]);

  function switchLocale(next: string) {
    setOpen(false);
    if (next === locale) return;
    // Mirror LanguageSwitcher: persist NEXT_LOCALE so middleware honors it on unprefixed entries.
    document.cookie = `NEXT_LOCALE=${next}; Max-Age=31536000; Path=/; SameSite=Lax`;
    intlRouter.replace(pathname, { locale: next as never });
  }

  const username = me?.username ?? "";
  const initial = (username || me?.email || "?").charAt(0).toUpperCase();
  const avatarUrl = me?.avatarUrl ?? "";

  // Cache the initial + avatar so the header's seeded avatar slot can paint them before auth resolves
  // on the next navigation — no grey→green flash (and no initial→photo flash) between pages.
  useEffect(() => {
    if (initial && initial !== "?") cacheMeInitial(initial);
  }, [initial]);
  useEffect(() => {
    cacheMeAvatar(avatarUrl);
  }, [avatarUrl]);

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("account")}
        className="focus-ring grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-accent-100 text-[13px] font-semibold text-accent-700 transition-colors hover:bg-accent-200 dark:bg-accent-500/20 dark:text-accent-300 dark:hover:bg-accent-500/30"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-60 origin-top-right animate-dropdown-in rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {(username || me?.email) && (
            <div className="px-3 py-2">
              {username && (
                <p className="truncate text-sm font-semibold text-slate-900">@{username}</p>
              )}
              {me?.email && <p className="truncate text-[12px] text-slate-500">{me.email}</p>}
            </div>
          )}

          {username && (
            <>
              <div className="my-1 h-px bg-slate-100" />
              {/* 분석 진입은 글 목록 strip 이 아니라 여기 — 프로필 바로 아래의 전용 버튼. */}
              <a href={blogHref("/analytics")} role="menuitem" className={itemClass}>
                <BarChart3 className="h-4 w-4 text-slate-500" />
                {t("analytics")}
              </a>
              {/* The viewer's two public surfaces — separate products, one identity. */}
              <a href={authorHref(username, locale)} role="menuitem" className={itemClass}>
                <Newspaper className="h-4 w-4 text-slate-500" />
                {t("blog")}
              </a>
              <a href={linksHref(`/${locale}/u/${username}`)} role="menuitem" className={itemClass}>
                <User className="h-4 w-4 text-slate-500" />
                {t("profile")}
              </a>
            </>
          )}

          <div className="my-1 h-px bg-slate-100" />
          {/* Collapsed by default — shows the current language; expands the picker on demand so the
              3 locales don't dominate the menu. */}
          <button
            type="button"
            aria-expanded={langOpen}
            onClick={() => setLangOpen((v) => !v)}
            className={cn(itemClass, "justify-between")}
          >
            <span className="inline-flex items-center gap-2.5">
              <Globe className="h-4 w-4 text-slate-500" />
              {tLang("label")}
            </span>
            <span className="inline-flex items-center gap-1 text-[13px] text-slate-400">
              {tLang(locale)}
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", langOpen && "rotate-180")}
              />
            </span>
          </button>
          {langOpen &&
            routing.locales.map((l) => (
              <button
                key={l}
                type="button"
                role="menuitem"
                onClick={() => switchLocale(l)}
                className={cn(itemClass, "justify-between pl-9", l === locale && "text-accent-700")}
              >
                {tLang(l)}
                {l === locale && <Check className="h-4 w-4 text-accent-600" />}
              </button>
            ))}

          <div className="my-1 h-px bg-slate-100" />
          <ThemeToggle className={itemClass} />

          <div className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push(`/${locale}`);
            }}
            className={itemClass}
          >
            <LogOut className="h-4 w-4 text-slate-500" />
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}
