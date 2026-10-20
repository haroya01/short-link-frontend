"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Languages,
  Layers,
  LogOut,
  Settings,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { getPathname, usePathname, useRouter as useIntlRouter } from "@/i18n/navigation";
import { isEditorDirty } from "@/modules/blog/lib/editor-dirty-store";
import { routing } from "@/i18n/routing";
import { useAuth } from "@/lib/auth";
import { useDismiss } from "@/hooks/use-dismiss";
import { usePresence } from "@/hooks/use-presence";
import { MeAvatar, cacheMeAvatar, cacheMeInitial } from "@/components/common/header-avatar-slot";
import { blogHref, type Product } from "@/lib/host";
import { BlogChromeLink } from "@/modules/blog/components/blog-link";
import { authorHref } from "@/modules/blog/lib/author-href";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { cn } from "@/lib/utils";

/**
 * Signed-in account control. An avatar button (the viewer's initial — `Me` carries no photo) opens a
 * dropdown that gathers everything personal in one place: language, theme, and sign out. Keeps "sign
 * out" off the bar and consolidates the surface-level controls, Google/Naver style; the cross-product
 * app switcher (AppsGrid) stays a separate control. Closes on outside-click or Escape.
 *
 * `product` slims the personal rows per surface:
 *  - "blog" (default): the top row opens the viewer's author page, then studio, analytics, library,
 *    collections and settings.
 *  - "links": no personal rows — 계정 is a top-nav entry and the blog↔kurl switch is the AppsGrid
 *    pill, so the menu keeps only theme, language and sign out.
 */
export function AccountMenu({ product = "blog" }: { product?: Product }) {
  const isLinks = product === "links";
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
  // Hold the menu mounted through its dropdown-out exit (mirror of the dropdown-in entrance).
  const { mounted, closing } = usePresence(open, 160);

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
    if (isEditorDirty()) window.location.assign(getPathname({ href: pathname, locale: next as never }));
    else intlRouter.replace(pathname, { locale: next as never });
  }

  const username = me?.username ?? "";
  const displayName = me?.displayName ?? "";
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
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800 focus-visible:outline-none";

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
      {mounted && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 z-30 mt-2 w-60 origin-top-right rounded-2xl border border-slate-200 bg-white p-1 shadow-float dark:border-slate-700 dark:bg-slate-850",
            closing ? "animate-dropdown-out" : "animate-dropdown-in",
          )}
        >
          {!isLinks && username ? (
            <a
              href={authorHref(username, locale)}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(itemClass, "gap-3")}
            >
              <MeAvatar src={avatarUrl} initial={initial} className="h-8 w-8 text-[13px]" />
              <span className="min-w-0 flex-1">
                {displayName && (
                  <span className="block truncate font-semibold text-slate-900 dark:text-slate-100">{displayName}</span>
                )}
                <span
                  className={cn(
                    "block truncate",
                    displayName
                      ? "text-[12px] text-slate-500 dark:text-slate-400"
                      : "font-semibold text-slate-900 dark:text-slate-100",
                  )}
                >
                  @{username}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
            </a>
          ) : (
            (username || me?.email) && (
              <div className="px-3 py-2">
                {username && (
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">@{username}</p>
                )}
                {me?.email && <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">{me.email}</p>}
              </div>
            )
          )}

          {!isLinks && username && (
            <>
              <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
              <a href={blogHref("/write")} role="menuitem" className={itemClass}>
                <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                {t("studio")}
              </a>
              <a href={blogHref("/analytics")} role="menuitem" className={itemClass}>
                <BarChart3 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                {t("analytics")}
              </a>
              {/* 내 컬렉션 — the reader's own collections/paths (private included), the make-side twin of
                  the discover feed. */}
              <a href={blogHref("/collections")} role="menuitem" className={itemClass}>
                <Layers className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                {t("myCollections")}
              </a>
              <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
              <div role="group" aria-labelledby="account-menu-collected" data-testid="account-collected">
                <p id="account-menu-collected" className="px-3 pb-1 pt-1.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  {t("collected")}
                </p>
                <a href={blogHref("/curation")} role="menuitem" className={itemClass}>
                  <Bookmark className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  {t("library")}
                </a>
                <BlogChromeLink
                  href={blogHref("/notes?feed=bookmarks")}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={itemClass}
                >
                  <span aria-hidden className="h-4 w-4" />
                  {t("noteBookmarks")}
                </BlogChromeLink>
                <BlogChromeLink
                  href={blogHref("/notes?feed=lists")}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={itemClass}
                >
                  <span aria-hidden className="h-4 w-4" />
                  {t("noteLists")}
                </BlogChromeLink>
              </div>
            </>
          )}

          <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
          {!isLinks && (
            <a href={blogHref("/settings")} role="menuitem" className={itemClass}>
              <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              {t("settings")}
            </a>
          )}
          {/* Collapsed by default — shows the current language; expands the picker on demand so the
              3 locales don't dominate the menu. */}
          <button
            type="button"
            aria-expanded={langOpen}
            onClick={() => setLangOpen((v) => !v)}
            className={cn(itemClass, "justify-between")}
          >
            <span className="inline-flex items-center gap-2.5">
              <Languages className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              {tLang("label")}
            </span>
            <span className="inline-flex items-center gap-1 text-[13px] text-slate-500 dark:text-slate-400">
              {tLang(locale)}
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", langOpen && "rotate-180")}
              />
            </span>
          </button>
          {/* Locale rows collapse via the grid 0fr↔1fr trick (series-reading-shell) — height-auto in
              both directions, no measured pixels. They stay in the DOM while folded, so aria-hidden +
              tabIndex keep them out of the focus order / accessibility tree until expanded. */}
          <div
            aria-hidden={!langOpen}
            className={cn(
              "grid transition-[grid-template-rows] duration-300 ease-[var(--ease)] motion-reduce:transition-none",
              langOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              {routing.locales.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="menuitem"
                  tabIndex={langOpen ? undefined : -1}
                  onClick={() => switchLocale(l)}
                  aria-current={l === locale ? "true" : undefined}
                  className={cn(itemClass, "justify-between pl-9")}
                >
                  {tLang(l)}
                  {l === locale && <Check className="h-4 w-4 text-accent-600 dark:text-accent-400" aria-hidden />}
                </button>
              ))}
            </div>
          </div>

          {isLinks && <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />}
          <ThemeToggle className={itemClass} />

          <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
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
            <LogOut className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}
