"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const STORAGE_KEY = "kurl:cookie-consent:v1";

export function CookieConsent() {
  const t = useTranslations("cookieConsent");
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === "accepted") return;
    setShow(true);
  }, []);

  // Suppress on chrome-less surfaces (public profile pages) — visitors who land via someone's
  // bio link expect a clean preview, not a banner from a service they've never used.
  if (pathname.startsWith("/u/")) return null;
  if (!show) return null;

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      /* ignore quota / privacy mode */
    }
    setShow(false);
  }

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label={t("ariaLabel")}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:bottom-4 sm:px-4 sm:pb-0"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur sm:ml-auto sm:mr-0 sm:max-w-[520px] sm:gap-3 sm:px-3.5 sm:py-3">
        <p className="min-w-0 flex-1 text-[11px] leading-snug text-slate-600 sm:text-xs sm:leading-relaxed">
          {t("message")}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/privacy"
            className="hidden text-xs text-slate-500 underline hover:text-slate-700 sm:inline"
          >
            {t("learnMore")}
          </Link>
          <button
            type="button"
            onClick={accept}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-slate-800 sm:px-4 sm:py-2 sm:text-xs"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
