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
      role="dialog"
      aria-live="polite"
      aria-label="cookie consent"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-lg sm:flex-row sm:items-center">
        <p className="flex-1 text-xs leading-relaxed text-slate-600">{t("message")}</p>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <Link
            href="/privacy"
            className="text-xs text-slate-500 underline hover:text-slate-700"
          >
            {t("learnMore")}
          </Link>
          <button
            type="button"
            onClick={accept}
            className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
