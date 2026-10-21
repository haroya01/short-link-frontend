"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { writeStorageString } from "@/lib/storage-json";
import { themeCookieName, writeThemeCookie } from "@/lib/theme-cookie";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";

/** The `.kurl.me` cookie and localStorage are read back by the no-FOUC script in the root layout. */
export function ThemeToggle({
  className,
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  const t = useTranslations("nav");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    const apply = () => {
      setDark(next);
      document.documentElement.classList.toggle("dark", next);
      const value = next ? "dark" : "light";
      writeThemeCookie(value); // per-product cookie (blog=theme, kurl=kurl_theme)
      writeStorageString(themeCookieName(), value); // same-origin fallback, same per-product key
    };

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<unknown> };
    };
    if (!doc.startViewTransition || prefersReducedMotion()) {
      apply();
      return;
    }
    // Mark the root for the duration so the theme wipe is scoped to `html[data-theme-vt]` and the
    // cross-document page-navigation transition (which shares `::view-transition(root)`) doesn't
    // inherit the wipe — see globals.css.
    const root = document.documentElement;
    root.setAttribute("data-theme-vt", "");
    const vt = doc.startViewTransition(apply);
    vt.finished.finally(() => root.removeAttribute("data-theme-vt"));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={iconOnly ? t("theme") : undefined}
      title={iconOnly ? t("theme") : undefined}
      className={className}
    >
      {/* iconOnly 는 누르면 갈 모드를, 행은 지금 모드를 보여 준다. */}
      <span className="inline-flex items-center gap-3">
        {(iconOnly ? !dark : dark) ? (
          <Moon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        ) : (
          <Sun className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        )}
        {!iconOnly && t("theme")}
      </span>
      {!iconOnly && (
        <span className="ml-auto pl-3 text-[13px] text-slate-500 dark:text-slate-400">
          {dark ? t("themeDark") : t("themeLight")}
        </span>
      )}
    </button>
  );
}
