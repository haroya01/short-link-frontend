"use client";

import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("languageSwitcher");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        aria-label={t("label")}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="font-mono uppercase">{locale}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-32 overflow-hidden rounded-md border border-slate-200 bg-white shadow-md"
        >
          {routing.locales.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitem"
              onClick={() => switchTo(l)}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50",
                l === locale && "bg-accent-50 text-accent-700",
              )}
            >
              {t(l)}
              <span className="font-mono text-[10px] uppercase text-slate-500">{l}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
