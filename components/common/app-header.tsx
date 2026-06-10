"use client";

import { usePathname } from "next/navigation";
import { LogIn, Menu, PenSquare, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogHref, type Product } from "@/lib/host";
import { BlogChromeLink } from "@/modules/blog/components/blog-link";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/common/account-menu";
import { HeaderAvatarSlot } from "@/components/common/header-avatar-slot";
import { useAuthHint } from "@/components/common/auth-hint";
import { AppsGrid } from "@/components/common/apps-grid";
import { NotificationBell } from "@/components/common/notification-bell";
import { BlogHeaderSearch } from "@/components/common/blog-header-search";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { Logo } from "@/components/common/logo";
import { useSidebarState } from "@/components/common/sidebar-state";

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
  // Server's first-paint guess (refresh-cookie presence, via the root layout). Until the client `/me`
  // settles, trust it so the auth-dependent header (Write button, account avatar) renders immediately
  // instead of flashing in on a cold load. Reconciles to the real auth once ready.
  const initialAuthed = useAuthHint();
  const showAuthed = ready ? authenticated : initialAuthed;

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

  return (
    <header className="vt-app-header sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="container flex h-14 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {showMenu && (
            <button
              type="button"
              onClick={toggle}
              className="touch-target -ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:hidden"
              aria-label={open ? "close menu" : "open menu"}
              aria-expanded={open}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          )}
          {/* Blog header → the logo returns to the blog home, not the links app root. blogHref keeps
              the right host (blog.kurl.me, or /blog-preview on apex); BlogChromeLink upgrades the hop
              to a client-side navigation when already on that origin, so the chrome stays mounted.
              On the slim mobile surfaces the "blog.kurl" wordmark drops to just the mark so the screen
              leads with context (the author / post) — the full brand + product switch live in the
              bottom-nav 계정 sheet. The full wordmark returns at sm+ (and always in the workspace). */}
          <BlogChromeLink href={blogHref("/")} aria-label="blog.kurl" className="mark-hoverable shrink-0">
            {slimMobile ? (
              <>
                <Logo variant="blog" animated showText={false} className="sm:hidden" />
                <Logo variant="blog" animated className="hidden sm:inline-flex" />
              </>
            ) : (
              <Logo variant="blog" animated />
            )}
          </BlogChromeLink>
        </div>

        {/* Right cluster split into two zones: utilities for *this* surface (search + language) on
            the left, then a hairline divider, then the cross-product switcher + account on the right.
            The divider stops the switcher's "kurl/blog.kurl" wordmark pill from reading as a second
            brand mark beside the search field, and keeps the expanded search pill from sitting flush
            against the same-shaped switcher pill. */}
        <div
          className={`shrink-0 items-center gap-2 ${slimMobile ? "hidden sm:flex" : "flex"}`}
        >
          <BlogHeaderSearch defaultOpen={searchOpen} />
          {/* Signed-in users switch language inside the account menu; keep the standalone control for
              signed-out visitors who have no account menu. */}
          {!showAuthed && <LanguageSwitcher />}
          <span aria-hidden className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
          {/* Persistent Write action lives here (top-right) rather than floating in the feed tab row —
              a standard, expected home for the primary action. Mobile uses the bottom tab bar. */}
          {showAuthed && (
            <BlogChromeLink
              href={blogHref("/write/new")}
              className="focus-ring hidden h-8 items-center gap-1.5 rounded-full bg-accent-700 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-800 sm:inline-flex"
            >
              <PenSquare className="h-3.5 w-3.5" />
              {t("write")}
            </BlogChromeLink>
          )}
          {showAuthed && <NotificationBell />}
          <AppsGrid current={product} />
          {!ready ? (
            initialAuthed ? (
              // Seeded authed: an avatar slot that mirrors AccountMenu (accent circle + cached initial)
              // holds the spot until it mounts — no grey→green flash on each navigation.
              <HeaderAvatarSlot />
            ) : (
              loginButton
            )
          ) : authenticated ? (
            <AccountMenu />
          ) : (
            loginButton
          )}
        </div>
      </div>
    </header>
  );
}
