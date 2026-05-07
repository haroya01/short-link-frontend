"use client";

import { LogOut } from "lucide-react";
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
  const { authenticated, ready, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="kurl">
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
            {isAdmin && (
              <NavLink href="/admin" active={pathname.startsWith("/admin")}>
                {t("admin")}
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
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
              {t("logout")}
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
