"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, Globe, LogIn, LogOut, Newspaper, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { usePathname, useRouter as useIntlRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useAuth } from "@/lib/auth";
import { blogHref, currentProduct, linksHref, type Product } from "@/lib/host";
import { authorHref } from "@/modules/blog/components/feed-card";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { cn } from "@/lib/utils";

const ITEM =
  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] text-slate-700 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800/60 dark:focus-visible:bg-slate-800/60";

/**
 * Mobile account bottom sheet, opened from the bottom-nav 계정 tab. Gathers everything personal that
 * used to crowd the top bar: the viewer's two surfaces (블로그/프로필), the cross-product switch
 * (kurl ↔ blog.kurl), language, and sign out — or sign in when signed out.
 */
export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("nav");
  const tLang = useTranslations("languageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const intlRouter = useIntlRouter();
  const pathname = usePathname();
  const { me, authenticated, signOut, signInWithGoogle } = useAuth();
  const [langOpen, setLangOpen] = useState(false);
  const [other, setOther] = useState<Product | null>(null);

  useEffect(() => {
    if (!open) {
      setLangOpen(false);
      return;
    }
    setOther(currentProduct() === "blog" ? "links" : "blog");
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const username = me?.username ?? "";
  const initial = (username || me?.email || "?").charAt(0).toUpperCase();

  function switchLocale(next: string) {
    if (next !== locale) {
      document.cookie = `NEXT_LOCALE=${next}; Max-Age=31536000; Path=/; SameSite=Lax`;
      intlRouter.replace(pathname, { locale: next as never });
    }
    onClose();
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={t("account")} className="fixed inset-0 z-50 sm:hidden">
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-slate-900/30"
      />
      <div className="absolute inset-x-0 bottom-0 animate-fade-in rounded-t-2xl bg-white p-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.3)] dark:bg-slate-900">
        <div className="mx-auto mb-1 mt-1 h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden />

        {authenticated && (
          <>
            <div className="flex items-center gap-3 px-3 py-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700">
                {initial}
              </span>
              <span className="min-w-0">
                {username && <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">@{username}</span>}
                {me?.email && <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">{me.email}</span>}
              </span>
            </div>
            <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
            <a href={authorHref(username, locale)} className={ITEM}>
              <Newspaper className="h-5 w-5 text-slate-500" />
              {t("blog")}
            </a>
            <a href={linksHref(`/${locale}/u/${username}`)} className={ITEM}>
              <User className="h-5 w-5 text-slate-500" />
              {t("profile")}
            </a>
          </>
        )}

        {/* Cross-product switch (kurl ↔ blog.kurl) — distinct from "내 블로그" above. */}
        {other && (
          <a
            href={other === "links" ? linksHref("/") : blogHref("/")}
            className={cn(ITEM, "justify-between")}
          >
            <span className="inline-flex items-center gap-3">
              <ArrowUpRight className="h-5 w-5 text-slate-500" />
              {other === "links" ? "kurl" : "blog.kurl"}
            </span>
          </a>
        )}

        <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
        <ThemeToggle className={cn(ITEM, "justify-between")} />
        <button
          type="button"
          aria-expanded={langOpen}
          onClick={() => setLangOpen((v) => !v)}
          className={cn(ITEM, "justify-between")}
        >
          <span className="inline-flex items-center gap-3">
            <Globe className="h-5 w-5 text-slate-500" />
            {tLang("label")}
          </span>
          <span className="inline-flex items-center gap-1 text-[13px] text-slate-400">
            {tLang(locale)}
            <ChevronDown className={cn("h-4 w-4 transition-transform", langOpen && "rotate-180")} />
          </span>
        </button>
        {langOpen &&
          routing.locales.map((l) => (
            <button
              key={l}
              type="button"
              aria-current={l === locale ? "true" : undefined}
              onClick={() => switchLocale(l)}
              className={cn(ITEM, "justify-between pl-11", l === locale && "text-accent-700")}
            >
              {tLang(l)}
              {l === locale && <Check className="h-4 w-4 text-accent-600" />}
            </button>
          ))}

        <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
        {authenticated ? (
          <button
            type="button"
            onClick={async () => {
              onClose();
              await signOut();
              router.push(`/${locale}`);
            }}
            className={ITEM}
          >
            <LogOut className="h-5 w-5 text-slate-500" />
            {t("logout")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              onClose();
              signInWithGoogle();
            }}
            className={ITEM}
          >
            <LogIn className="h-5 w-5 text-slate-500" />
            {t("login")}
          </button>
        )}
      </div>
    </div>
  );
}
