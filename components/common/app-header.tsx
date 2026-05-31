"use client";

import { LogIn, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/common/account-menu";
import { AppsGrid } from "@/components/common/apps-grid";
import { BlogHeaderSearch } from "@/components/common/blog-header-search";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { Logo } from "@/components/common/logo";
import { useSidebarState } from "@/components/common/sidebar-state";

/**
 * `showMenu` toggles the mobile sidebar button — off for the public feed, which has no sidebar.
 * `searchOpen` rests the header search field open (used on the blog feed home, the discovery hub).
 */
export function AppHeader({
  showMenu = true,
  searchOpen = false,
}: {
  showMenu?: boolean;
  searchOpen?: boolean;
}) {
  const t = useTranslations("nav");
  const { authenticated, ready, signInWithGoogle } = useAuth();
  const { open, toggle } = useSidebarState();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {showMenu && (
            <button
              type="button"
              onClick={toggle}
              className="-ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100 sm:hidden"
              aria-label={open ? "close menu" : "open menu"}
              aria-expanded={open}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          )}
          {/* Blog header → the logo returns to the blog home, not the links app root. Plain anchor
              with blogHref so it lands on the right host (blog.kurl.me, or /blog-preview on apex). */}
          <a href={blogHref("/")} aria-label="blog.kurl" className="mark-hoverable shrink-0">
            <Logo variant="blog" animated />
          </a>
        </div>

        {/* Right cluster split into two zones: utilities for *this* surface (search + language) on
            the left, then a hairline divider, then the cross-product switcher + account on the right.
            The divider stops the switcher's "kurl/blog.kurl" wordmark pill from reading as a second
            brand mark beside the search field, and keeps the expanded search pill from sitting flush
            against the same-shaped switcher pill. */}
        <div className="flex shrink-0 items-center gap-2">
          <BlogHeaderSearch defaultOpen={searchOpen} />
          {/* Signed-in users switch language inside the account menu; keep the standalone control for
              signed-out visitors who have no account menu. */}
          {!authenticated && <LanguageSwitcher />}
          <span aria-hidden className="h-5 w-px bg-slate-200" />
          <AppsGrid />
          {!ready ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
          ) : authenticated ? (
            <AccountMenu />
          ) : (
            <Button variant="default" size="sm" onClick={signInWithGoogle}>
              <LogIn className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("login")}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
