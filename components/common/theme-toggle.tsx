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
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // private mode / storage disabled — toggle still applies for the session.
    }
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
