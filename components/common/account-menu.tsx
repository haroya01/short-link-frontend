"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe, LogOut, Newspaper, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { usePathname, useRouter as useIntlRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useAuth } from "@/lib/auth";
import { linksHref } from "@/lib/host";
import { authorHref } from "@/modules/blog/components/feed-card";
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
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
        className="focus-ring grid h-8 w-8 place-items-center rounded-full bg-accent-100 text-[13px] font-semibold text-accent-700 transition-colors hover:bg-accent-200"
      >
        {initial}
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
          <div className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {tLang("label")}
            </span>
          </div>
          {routing.locales.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitem"
              onClick={() => switchLocale(l)}
              className={cn(itemClass, "justify-between", l === locale && "text-accent-700")}
            >
              {tLang(l)}
              {l === locale && <Check className="h-4 w-4 text-accent-600" />}
            </button>
          ))}

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
