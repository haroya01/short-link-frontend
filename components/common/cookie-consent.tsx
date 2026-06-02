"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { linksHref } from "@/lib/host";
import { readStorageString, writeStorageString } from "@/lib/storage-json";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "kurl:cookie-consent:v1";

/** `darkAware` opts this instance into `dark:` variants — set on the blog (which has a dark theme).
 *  The links product leaves it off so the banner stays light even when `.dark` is set globally. */
export function CookieConsent({ darkAware = false }: { darkAware?: boolean }) {
  const t = useTranslations("cookieConsent");
  const locale = useLocale();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (readStorageString(STORAGE_KEY) !== "accepted") setShow(true);
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
    writeStorageString(STORAGE_KEY, "accepted");
    setShow(false);
  }

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label={t("ariaLabel")}
      className="fixed inset-x-0 bottom-[var(--cookie-bottom)] z-40 sm:bottom-4 sm:px-4"
    >
      {/* Phones: an edge-to-edge bar (top border + upward shadow) that sits directly above the bottom
          tab bar so it reads as system chrome and never covers the tabs. sm+: the compact
          right-aligned rounded card returns. */}
      <div
        className={cn(
          "mx-auto flex max-w-3xl items-center gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-6px_20px_-12px_rgba(15,23,42,0.25)] backdrop-blur sm:ml-auto sm:mr-0 sm:max-w-[520px] sm:gap-3 sm:rounded-lg sm:border sm:px-3.5 sm:py-3 sm:shadow-md",
          darkAware && "dark:border-slate-800 dark:bg-slate-900/95",
        )}
      >
        <p
          className={cn(
            "min-w-0 flex-1 text-[11px] leading-snug text-slate-600 sm:text-xs sm:leading-relaxed",
            darkAware && "dark:text-slate-300",
          )}
        >
          {t("message")}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={linksHref(`/${locale}/privacy`)}
            className={cn(
              "hidden text-xs text-slate-500 underline hover:text-slate-700 sm:inline",
              darkAware && "dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {t("learnMore")}
          </a>
          <button
            type="button"
            onClick={accept}
            className={cn(
              "rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-slate-800 sm:px-4 sm:py-2 sm:text-xs",
              darkAware && "dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
            )}
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
