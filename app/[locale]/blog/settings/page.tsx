"use client";

import { Check, ExternalLink, Globe, LogOut, Newspaper, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { usePathname, useRouter as useIntlRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useAuth } from "@/lib/auth";
import { linksHref } from "@/lib/host";
import { authorHref } from "@/modules/blog/components/feed-card";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { cn } from "@/lib/utils";

/**
 * Blog settings. Account-level settings (profile fields, password, danger zone) live on the links
 * product (app/[locale]/links/settings*) — they're one identity across both surfaces — so this page
 * surfaces the account here and deep-links to those rather than duplicating the forms. The
 * blog-local bits (theme, language, the viewer's two public surfaces, sign out) live inline.
 */
export default function BlogSettingsPage() {
  const t = useTranslations("blogWorkspace");
  const tNav = useTranslations("nav");
  const tLang = useTranslations("languageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const intlRouter = useIntlRouter();
  const pathname = usePathname();
  const { ready, authenticated, me, signOut } = useAuth();

  if (!ready) return null;
  if (!authenticated) {
    return <main className="px-6 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>;
  }

  const username = me?.username ?? "";
  const initial = (username || me?.email || "?").charAt(0).toUpperCase();

  function switchLocale(next: string) {
    if (next === locale) return;
    // Mirror AccountMenu: persist NEXT_LOCALE so middleware honors it on unprefixed entries.
    document.cookie = `NEXT_LOCALE=${next}; Max-Age=31536000; Path=/; SameSite=Lax`;
    intlRouter.replace(pathname, { locale: next as never });
  }

  const rowClass =
    "focus-ring flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60";

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("settingsTitle")}</h1>
      <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{t("settingsSubtitle")}</p>

      {/* 계정 */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("settingsAccount")}</h2>
        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-100 text-base font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-300">
              {initial}
            </span>
            <div className="min-w-0">
              {username && (
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">@{username}</p>
              )}
              {me?.email && <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">{me.email}</p>}
            </div>
          </div>

          <div className="mt-3 space-y-0.5 border-t border-slate-100 pt-2 dark:border-slate-800">
            <a href={linksHref(`/${locale}/settings/profile`)} className={rowClass}>
              <span className="inline-flex items-center gap-2.5">
                <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                {t("settingsEditProfile")}
              </span>
              <ExternalLink className="h-4 w-4 text-slate-300 dark:text-slate-500" />
            </a>
            <a href={linksHref(`/${locale}/settings`)} className={rowClass}>
              <span className="inline-flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                {t("settingsAccountSettings")}
              </span>
              <ExternalLink className="h-4 w-4 text-slate-300 dark:text-slate-500" />
            </a>
            {username && (
              <a href={authorHref(username, locale)} className={rowClass}>
                <span className="inline-flex items-center gap-2.5">
                  <Newspaper className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  {t("settingsViewBlog")}
                </span>
                <ExternalLink className="h-4 w-4 text-slate-300 dark:text-slate-500" />
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 화면 */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("settingsDisplay")}</h2>
        <div className="rounded-2xl border border-slate-200 p-2 dark:border-slate-800">
          <ThemeToggle className={rowClass} />
          <div className="px-3 pb-1 pt-3 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {tLang("label")}
          </div>
          {routing.locales.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => switchLocale(l)}
              aria-pressed={l === locale}
              className={cn(rowClass, "w-full", l === locale && "text-accent-700 dark:text-accent-300")}
            >
              {tLang(l)}
              {l === locale && <Check className="h-4 w-4 text-accent-600 dark:text-accent-400" />}
            </button>
          ))}
        </div>
      </section>

      {/* 로그아웃 */}
      <section className="mt-8">
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push(`/${locale}`);
          }}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-800 dark:text-slate-200 dark:hover:border-red-900/50 dark:hover:bg-red-950/40"
        >
          <LogOut className="h-4 w-4" />
          {tNav("logout")}
        </button>
      </section>
    </main>
  );
}
