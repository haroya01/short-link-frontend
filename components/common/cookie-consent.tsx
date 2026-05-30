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
  const suppressed = pathname.startsWith("/u/");

  // Flag the visible banner on <body> so fixed elements (the blog write FAB) and page padding can
  // make room for it on phones — see body[data-cookie-consent] in globals.css. Cleared on accept,
  // on suppressed surfaces, and on unmount.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (show && !suppressed) {
      document.body.dataset.cookieConsent = "visible";
    } else {
      delete document.body.dataset.cookieConsent;
    }
    return () => {
      delete document.body.dataset.cookieConsent;
    };
  }, [show, suppressed]);

  if (suppressed) return null;
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
      className="fixed inset-x-0 bottom-0 z-40 sm:bottom-4 sm:px-4"
    >
      {/* Phones: an edge-to-edge bottom bar (top border + upward shadow) so it reads as system chrome
          instead of a floating card stacked under the FAB. sm+: the compact right-aligned rounded
          card returns. */}
      <div className="mx-auto flex max-w-3xl items-center gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-6px_20px_-12px_rgba(15,23,42,0.25)] backdrop-blur sm:ml-auto sm:mr-0 sm:max-w-[520px] sm:gap-3 sm:rounded-lg sm:border sm:px-3.5 sm:py-3 sm:pb-3 sm:shadow-md">
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
