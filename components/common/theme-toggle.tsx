"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { writeStorageString } from "@/lib/storage-json";
import { themeCookieName, writeThemeCookie } from "@/lib/theme-cookie";

/**
 * Dark-mode toggle. Flips the `dark` class on <html> and persists the choice to a `.kurl.me` cookie
 * plus localStorage (same-origin fallback), read back by the no-FOUC script in the root layout.
 * 쿠키 이름은 제품별(themeCookieName: 블로그=theme, kurl=kurl_theme) — 블로그에서 다크를 써도
 * kurl 은 기본 백을 지킨다. Dark is an explicit opt-in — light until the user picks dark (we don't
 * auto-follow the OS theme). Default render is a full-width row (account menu / sheet); `iconOnly`
 * drops the label for a compact icon button (e.g. the kurl desktop top nav).
 */
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
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={iconOnly ? t("theme") : undefined}
      title={iconOnly ? t("theme") : undefined}
      className={className}
    >
      {/* 아이콘 문법이 렌더별로 다르다: iconOnly(상단 바)는 누르면 갈 모드(라이트에서 달) — 행동
          버튼이라 목적지를 보여준다. 행 렌더는 현재 모드 아이콘 + 오른쪽 현재값 라벨 — "옵션"이니
          지금 상태가 읽혀야 한다(언어 행이 현재 로케일을 보여주는 것과 같은 문법). */}
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
