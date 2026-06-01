"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Dark-mode toggle. Flips the `dark` class on <html> and persists the choice to localStorage (read
 * back by the no-FOUC script in the root layout). Defaults to the system preference until the user
 * picks. Rendered as a full-width row to drop into the account menu / sheet.
 */
export function ThemeToggle({ className }: { className?: string }) {
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
      try {
        localStorage.setItem("theme", next ? "dark" : "light");
      } catch {
        // private mode / storage disabled — toggle still applies for the session.
      }
    };

    // Sweep the new theme down over the old via the View Transitions API (CSS in globals.css drives
    // the top-to-bottom wipe). Unsupported browsers / reduced-motion just flip instantly.
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<unknown> };
    };
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduce) {
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
    <button type="button" onClick={toggle} aria-pressed={dark} className={className}>
      <span className="inline-flex items-center gap-3">
        {dark ? (
          <Sun className="h-5 w-5 text-slate-500" />
        ) : (
          <Moon className="h-5 w-5 text-slate-500" />
        )}
        {t("theme")}
      </span>
    </button>
  );
}
