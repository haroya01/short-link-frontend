"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  FileText,
  Globe,
  Inbox,
  LogIn,
  LogOut,
  Newspaper,
  Settings,
  Sparkles,
  User,
  Webhook,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { usePathname, useRouter as useIntlRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useAuth } from "@/lib/auth";
import { blogHref, currentProduct, linksHref, type Product } from "@/lib/host";
import { useUnreadCount } from "@/modules/notifications/lib/use-notifications";
import { authorHref } from "@/modules/blog/components/feed-card";
import { Logo } from "@/components/common/logo";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { cn } from "@/lib/utils";

const ITEM =
  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] text-slate-700 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800/60 dark:focus-visible:bg-slate-800/60";

/**
 * Mobile account bottom sheet. `product` slims it per surface:
 *  - "blog" (default): the full personal menu — the viewer's two surfaces (블로그/프로필), workspace
 *    entries (내 글/리드/…), the cross-product switch, language, sign out.
 *  - "links": kurl is its own app, so only 설정·테마·언어·로그아웃 here — its profile + blog↔kurl
 *    switch live in the bottom nav / top Nav instead, not duplicated in the sheet.
 */
export function AccountSheet({
  open,
  onClose,
  product = "blog",
}: {
  open: boolean;
  onClose: () => void;
  product?: Product;
}) {
  const isLinks = product === "links";
  const t = useTranslations("nav");
  const tNotif = useTranslations("notifications");
  const tBlog = useTranslations("sidebar.blog");
  const unread = useUnreadCount();
  const tLang = useTranslations("languageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const intlRouter = useIntlRouter();
  const pathname = usePathname();
  const { me, authenticated, signOut } = useAuth();
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
      <div className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col animate-fade-in rounded-t-2xl bg-white p-2 pb-0 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.3)] dark:bg-slate-900">
        <div className="mx-auto mb-1 mt-1 h-1 w-10 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden />

        {/* Scrollable menu body. The sheet pins to the bottom and grows upward, so without a height cap
            + overflow the top items (블로그/분석/…) clip off the top of short or landscape viewports —
            or when the language list expands — with no way to reach them. Cap at 88dvh and scroll; the
            grab handle above stays put. Bottom safe-area padding moves here so the last item clears the
            home indicator. */}
        <div className="overflow-y-auto pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {/* The blog brand lives here on mobile (it's dropped from the slim top bar so the screen leads
            with the author/post). This anchors the sheet as "where blog.kurl + the product switch are."
            On kurl the switch is in the top Nav, so the sheet leads straight with the account. */}
        {!isLinks && (
          <>
            <a href={blogHref("/")} aria-label="blog.kurl" className="mark-hoverable flex items-center px-3 py-2">
              <Logo variant="blog" />
            </a>
            <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
          </>
        )}

        {authenticated && (
          <>
            <div className="flex items-center gap-3 px-3 py-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-100 text-sm font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-300">
                {me?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </span>
              <span className="min-w-0">
                {username && <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">@{username}</span>}
                {me?.email && <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">{me.email}</span>}
              </span>
            </div>
            <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
            {/* kurl: just settings here — profile is a bottom-nav tab, the blog switch is in the top Nav. */}
            {isLinks && (
              <a href={linksHref(`/${locale}/settings`)} className={ITEM}>
                <Settings className="h-5 w-5 text-slate-500" />
                {t("settings")}
              </a>
            )}
            {!isLinks && (
            <>
            {/* 분석 진입은 글 목록 strip 이 아니라 프로필 바로 아래 전용 버튼. */}
            <a href={blogHref("/analytics")} className={ITEM}>
              <BarChart3 className="h-5 w-5 text-slate-500" />
              {t("analytics")}
            </a>
            <a href={authorHref(username, locale)} className={ITEM}>
              <Newspaper className="h-5 w-5 text-slate-500" />
              {t("blog")}
            </a>
            <a href={linksHref(`/${locale}/u/${username}`)} className={ITEM}>
              <User className="h-5 w-5 text-slate-500" />
              {t("profile")}
            </a>
            {/* Reader's private library — bookmarks + likes, on the workspace curation page. */}
            <a href={blogHref("/curation")} className={ITEM}>
              <Bookmark className="h-5 w-5 text-slate-500" />
              {t("library")}
            </a>
            {/* Notifications — mobile reaches the full page here (the desktop header bell has a
                dropdown). Unread badge mirrors the desktop bell. */}
            <a href={blogHref("/notifications")} className={cn(ITEM, "justify-between")}>
              <span className="inline-flex items-center gap-3">
                <Bell className="h-5 w-5 text-slate-500" />
                {tNotif("title")}
              </span>
              {unread > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent-600 px-1 text-[11px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </a>

            {/* Author workspace — the desktop sidebar's entries, which mobile otherwise can't reach
                (the bottom nav only has 홈/검색/글쓰기/계정). 분석은 별도 항목이 아니라 글의 facet 이라
                여기서도 빼고, 내 글(/write) 상단 요약 strip·글별 성과로 들어간다(#602). */}
            <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
            <a href={blogHref("/write")} className={ITEM}>
              <FileText className="h-5 w-5 text-slate-500" />
              {tBlog("myPosts")}
            </a>
            <a href={blogHref("/leads")} className={ITEM}>
              <Inbox className="h-5 w-5 text-slate-500" />
              {tBlog("leads")}
            </a>
            <a href={blogHref("/curation")} className={ITEM}>
              <Sparkles className="h-5 w-5 text-slate-500" />
              {tBlog("curation")}
            </a>
            <a href={blogHref("/webhooks")} className={ITEM}>
              <Webhook className="h-5 w-5 text-slate-500" />
              {tBlog("webhooks")}
            </a>
            <a href={blogHref("/settings")} className={ITEM}>
              <Settings className="h-5 w-5 text-slate-500" />
              {t("settings")}
            </a>
            </>
            )}
          </>
        )}

        {/* Cross-product switch (kurl ↔ blog.kurl) — distinct from "내 블로그" above. On kurl it lives
            in the top Nav instead, so it's dropped from the sheet here. */}
        {!isLinks && other && (
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
              // Through kurl's branded login screen (then Google), not straight to OAuth.
              window.location.href = `${blogHref("/login")}?next=${encodeURIComponent(pathname)}`;
            }}
            className={ITEM}
          >
            <LogIn className="h-5 w-5 text-slate-500" />
            {t("login")}
          </button>
        )}
        </div>
      </div>
    </div>
  );
}
