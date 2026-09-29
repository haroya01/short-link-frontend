"use client";

import { useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useDismiss } from "@/hooks/use-dismiss";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("languageSwitcher");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));

  function switchTo(next: string) {
    setOpen(false);
    // Persist the choice in NEXT_LOCALE so middleware honors it on unprefixed entries (`/`,
    // 404 → `/`, OAuth callbacks). Client-side `router.replace` updates the URL only; without
    // the cookie write the next request that hits middleware without a locale prefix would
    // fall back to the previously-detected locale and silently bounce the user back.
    // 1 year matches next-intl's default `localeCookie` lifetime.
    document.cookie = `NEXT_LOCALE=${next}; Max-Age=31536000; Path=/; SameSite=Lax`;
    router.replace(pathname, { locale: next as never });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label={t("label")}
        title={locale.toUpperCase()}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-40 rounded-2xl border border-slate-200 bg-white p-1 shadow-float dark:border-slate-700 dark:bg-slate-900"
        >
          {routing.locales.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitem"
              aria-current={l === locale ? "true" : undefined}
              onClick={() => switchTo(l)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t(l)}
              {l === locale && <Check className="h-4 w-4 text-accent-600 dark:text-accent-400" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
