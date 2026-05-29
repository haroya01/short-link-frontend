"use client";

import { LogIn, LogOut, Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { Button } from "@/components/ui/button";
import { AppsGrid } from "@/components/common/apps-grid";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { Logo } from "@/components/common/logo";
import { useSidebarState } from "@/components/common/sidebar-state";

/** `showMenu` toggles the mobile sidebar button — off for the public feed, which has no sidebar. */
export function AppHeader({ showMenu = true }: { showMenu?: boolean }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("nav");
  const { authenticated, ready, signOut, signInWithGoogle } = useAuth();
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
          <a href={blogHref("/")} aria-label="blog.kurl" className="shrink-0">
            <Logo variant="blog" />
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <AppsGrid />
          <LanguageSwitcher />
          {!ready ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-slate-100" />
          ) : authenticated ? (
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
