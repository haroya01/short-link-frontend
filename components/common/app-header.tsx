"use client";

import { type ComponentProps } from "react";
import { usePathname } from "next/navigation";
import { LogIn, Menu, PenSquare, X, Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogHref, type Product } from "@/lib/host";
import { BlogChromeLink } from "@/modules/blog/components/blog-link";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/common/account-menu";
import { HeaderAvatarSlot } from "@/components/common/header-avatar-slot";
import { AppsGrid } from "@/components/common/apps-grid";
import { NotificationBell } from "@/components/common/notification-bell";
import { BlogHeaderSearch } from "@/components/common/blog-header-search";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { Logo } from "@/components/common/logo";
import { useSidebarState } from "@/components/common/sidebar-state";
import { useEditorDirty } from "@/modules/blog/lib/editor-dirty-store";

/**
 * A chrome link that normally soft-navigates (BlogChromeLink) but falls back to a plain <a> hard
 * navigation while the post editor has unsaved edits. A soft navigation never triggers the editor's
 * beforeunload guard, so clicking the logo / Write CTA mid-edit would drop the unsaved work silently;
 * the hard navigation makes the browser show its "leave site?" prompt. Inert outside the editor —
 * useEditorDirty() is false everywhere else, so every other surface keeps the soft-nav behaviour.
 */
function ChromeNavLink(props: ComponentProps<typeof BlogChromeLink>) {
  const dirty = useEditorDirty();
  if (dirty) {
    const { href, children, ...rest } = props;
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return <BlogChromeLink {...props} />;
}

/**
 * `showMenu` toggles the mobile sidebar button — off for the public feed, which has no sidebar.
 * `searchOpen` rests the header search field open (used on the blog feed home, the discovery hub).
 * `slimMobile` hides the right-cluster controls on mobile — used on public surfaces where the bottom
 * tab bar carries search/account/switcher; the authoring workspace keeps the full header (no nav bar).
 */
export function AppHeader({
  showMenu = true,
  searchOpen = false,
  slimMobile = false,
  product,
}: {
  showMenu?: boolean;
  searchOpen?: boolean;
  slimMobile?: boolean;
  /** The product this header sits on — lets the switcher seed its destination without a load flash. */
  product?: Product;
}) {
  const t = useTranslations("nav");
  const { authenticated, ready } = useAuth();
  // First-paint auth guess. This used to be a server prop derived from the refresh cookie, but that
  // cookies() read forced the whole app dynamic (no edge caching). Now, until the client `/me`
  // settles, BOTH chrome variants render inside [data-auth-slot] wrappers and the pre-paint script
  // in the root layout (html[data-auth-hint], from the localStorage access token) lets CSS show the
  // right one — no flash for same-origin repeat visitors, no hydration mismatch, static layout.
  const showAuthed: boolean | null = ready ? authenticated : null;

  const loginButton = (
    <Button
      variant="default"
      size="sm"
      onClick={() => {
        // Route through kurl's own branded login screen (then Google) instead of bouncing straight
        // to the Google OAuth consent — carry the current page as the return ?next.
        window.location.href = `${blogHref("/login")}?next=${encodeURIComponent(pathname)}`;
      }}
    >
      <LogIn className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{t("login")}</span>
    </Button>
  );
  const { open, toggle } = useSidebarState();
  const pathname = usePathname();

  const mobileWriteCircle = (authed: boolean) => (
    <ChromeNavLink
      href={authed ? blogHref("/write/new") : `${blogHref("/login")}?next=${encodeURIComponent("/write/new")}`}
      aria-label={t("write")}
      className="focus-ring ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-700 text-white transition-colors hover:bg-accent-800 sm:hidden"
    >
      <PenSquare className="h-4 w-4" />
    </ChromeNavLink>
  );

  // The auth-dependent right cluster, rendered for a known auth state. Pre-`ready` BOTH variants
  // mount in [data-auth-slot] wrappers (display:contents; the pre-paint hint picks one via CSS), so
  // the pre-ready authed variant uses non-fetching placeholders: HeaderAvatarSlot instead of
  // AccountMenu, a bare bell instead of NotificationBell — a hidden live bell would still fire its
  // notifications fetch for visitors who turn out signed-out.
  const authCluster = (authed: boolean) => (
    <>
      {/* Signed-in users switch language inside the account menu; keep the standalone control for
          signed-out visitors who have no account menu. */}
      {!authed && <LanguageSwitcher />}
      <span aria-hidden className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
      {/* Persistent Write action lives here (top-right) rather than floating in the feed tab row —
          a standard, expected home for the primary action. Mobile uses the bottom tab bar. */}
      {authed && (
        <ChromeNavLink
          href={blogHref("/write/new")}
          className="focus-ring hidden h-8 items-center gap-1.5 rounded-full bg-accent-700 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-800 sm:inline-flex"
        >
          <PenSquare className="h-3.5 w-3.5" />
          {t("write")}
        </ChromeNavLink>
      )}
      {authed &&
        (ready ? (
          <NotificationBell />
        ) : (
          <span className="relative hidden h-8 w-8 items-center justify-center rounded-md text-slate-700 dark:text-slate-300 sm:inline-flex">
            <Bell className="h-5 w-5" />
          </span>
        ))}
      <AppsGrid current={product} />
      {!ready ? (
        authed ? (
          // Seeded authed: an avatar slot that mirrors AccountMenu (accent circle + cached initial)
          // holds the spot until it mounts — no grey→green flash on each navigation.
          <HeaderAvatarSlot />
        ) : (
          loginButton
        )
      ) : authenticated ? (
        <AccountMenu product={product} />
      ) : (
        loginButton
      )}
    </>
  );

  return (
    <header className="vt-app-header glass-chrome sticky top-0 z-30 border-b border-slate-200/60 dark:border-slate-800/60">
      <div className="container flex h-14 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {showMenu && (
            <button
              type="button"
              onClick={toggle}
              className="touch-target -ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:hidden"
              aria-label={open ? t("closeMenu") : t("openMenu")}
              aria-expanded={open}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          )}
          {/* Blog header → the logo returns to the blog home, not the links app root. blogHref keeps
              the right host (blog.kurl.me, or /blog-preview on apex); BlogChromeLink upgrades the hop
              to a client-side navigation when already on that origin, so the chrome stays mounted.
              모바일(<sm)에선 표면을 가리지 않고 마크만 — slim 공개 표면은 물론 워크스페이스도:
              워크스페이스는 우측 클러스터(검색·벨·전환 pill·아바타)가 모바일에서도 다 살아 있어
              풀 워드마크까지 들어가면 390px 에서 컨트롤들이 워드마크 위로 겹쳤다. */}
          <ChromeNavLink href={blogHref("/")} aria-label="kurl log" className="mark-hoverable shrink-0">
            <Logo variant="blog" animated showText={false} className="sm:hidden" />
            <Logo variant="blog" animated className="hidden sm:inline-flex" />
          </ChromeNavLink>
        </div>

        {/* Right cluster split into two zones: utilities for *this* surface (search + language) on
            the left, then a hairline divider, then the cross-product switcher + account on the right.
            The divider stops the switcher's "kurl/kurl log" wordmark pill from reading as a second
            brand mark beside the search field, and keeps the expanded search pill from sitting flush
            against the same-shaped switcher pill. */}
        {/* 모바일 글쓰기 — 하단 탭바 중앙 FAB 에서 이동: 스크롤 중 떠 있는 원형이 본문을 가리고
            거슬린다는 피드백. 콘텐츠 앱의 주 행동을 우상단 고정(헤더는 sticky)으로. slim 공개
            표면 전용 — 워크스페이스는 이미 글쓰기 안이고, 우측 클러스터가 모바일에도 살아 있어
            원형까지 끼면 헤더가 넘친다(워드마크 위 겹침 버그의 절반). */}
        {product === "blog" &&
          slimMobile &&
          (showAuthed === null ? (
            <>
              <span data-auth-slot="authed">{mobileWriteCircle(true)}</span>
              <span data-auth-slot="anon">{mobileWriteCircle(false)}</span>
            </>
          ) : (
            mobileWriteCircle(showAuthed)
          ))}
        <div
          className={`shrink-0 items-center gap-2 ${slimMobile ? "hidden sm:flex" : "flex"}`}
        >
          <BlogHeaderSearch defaultOpen={searchOpen} />
          {showAuthed === null ? (
            <>
              <span data-auth-slot="authed">{authCluster(true)}</span>
              <span data-auth-slot="anon">{authCluster(false)}</span>
            </>
          ) : (
            authCluster(showAuthed)
          )}
        </div>
      </div>
    </header>
  );
}
