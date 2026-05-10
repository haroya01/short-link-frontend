"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "./ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("nav");
  const { authenticated, ready, isAdmin, me, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [mobileOpen]);

  // Public profile pages render without site chrome — they're meant to feel like a standalone
  // bio link, the way Linktree pages do. Same logic in <Footer>. Must come AFTER all hooks per
  // React rules-of-hooks.
  if (pathname.startsWith("/u/")) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="-ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 sm:hidden"
            aria-label={mobileOpen ? "close menu" : "open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <Link href="/" aria-label="kurl" className="shrink-0">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink href="/" active={pathname === "/"}>
              {t("shorten")}
            </NavLink>
            {authenticated && (
              <NavLink href="/dashboard" active={pathname.startsWith("/dashboard")}>
                {t("myLinks")}
              </NavLink>
            )}
            {authenticated && (
              <ProfileNavLink username={me?.username ?? null} pathname={pathname} t={t} />
            )}
            {isAdmin && (
              <NavLink href="/admin" active={pathname.startsWith("/admin")}>
                {t("admin")}
              </NavLink>
            )}
            {authenticated && (
              <NavLink href="/settings" active={pathname.startsWith("/settings")}>
                {t("settings")}
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
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
            <Link href="/login">
              <Button size="sm" variant="default">
                {t("login")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div
          ref={mobileRef}
          className="border-t border-slate-200 bg-white sm:hidden"
        >
          <nav className="container flex flex-col py-2">
            <MobileNavLink href="/" active={pathname === "/"}>
              {t("shorten")}
            </MobileNavLink>
            {authenticated && (
              <MobileNavLink href="/dashboard" active={pathname.startsWith("/dashboard")}>
                {t("myLinks")}
              </MobileNavLink>
            )}
            {authenticated && (
              <ProfileMobileLink username={me?.username ?? null} t={t} />
            )}
            {isAdmin && (
              <MobileNavLink href="/admin" active={pathname.startsWith("/admin")}>
                {t("admin")}
              </MobileNavLink>
            )}
            {authenticated && (
              <MobileNavLink href="/settings" active={pathname.startsWith("/settings")}>
                {t("settings")}
              </MobileNavLink>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-slate-100 text-slate-900"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
      )}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-slate-100 text-slate-900"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Routes to the user's public profile when they've claimed a username, otherwise nudges them to
 * the settings page where they can claim one. Keeps a single nav slot regardless of state so the
 * layout doesn't shift between sign-in and first profile setup.
 */
function ProfileNavLink({
  username,
  pathname,
  t,
}: {
  username: string | null;
  pathname: string;
  t: ReturnType<typeof useTranslations<"nav">>;
}) {
  if (username) {
    const target = `/u/${username}`;
    return (
      <NavLink href={target} active={pathname === target}>
        {t("profile")}
      </NavLink>
    );
  }
  const target = "/profile/edit";
  return (
    <Link
      href="/profile/edit"
      className={cn(
        "rounded-md px-2.5 py-1.5 text-sm transition-colors",
        pathname === target
          ? "bg-slate-100 text-slate-900"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
      )}
    >
      {t("profile")}
    </Link>
  );
}

function ProfileMobileLink({
  username,
  t,
}: {
  username: string | null;
  t: ReturnType<typeof useTranslations<"nav">>;
}) {
  const href = username ? `/u/${username}` : "/profile/edit";
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
    >
      {t("profile")}
    </Link>
  );
}
