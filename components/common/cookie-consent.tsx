"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import {
  CONSENT_COOKIE,
  LEGACY_CONSENT_STORAGE_KEY,
  hasAcceptedConsent,
  writeConsentCookie,
} from "@/lib/cookie-consent";
import { linksHref } from "@/lib/host";
import { cn } from "@/lib/utils";

// Runs during HTML parse, before the banner below it can paint (same no-FOUC trick as the theme
// script in the root layout). Consented visitors — cookie, or the legacy localStorage flag — get
// `data-cc-accepted` on <html>, and the globals.css rule hides the banner until hydration unmounts
// it. Everyone else gets the body flag that reserves scroll room for the fixed bar. The flag can't
// leak onto suppressed surfaces because those never render this component, and so never ship this
// script.
const consentInitScript =
  "(function(){try{" +
  `var ok=/(?:^|; )${CONSENT_COOKIE}=accepted/.test(document.cookie)||localStorage.getItem('${LEGACY_CONSENT_STORAGE_KEY}')==='accepted';` +
  "if(ok){document.documentElement.setAttribute('data-cc-accepted','');}" +
  "else{document.body.dataset.cookieConsent='visible';}" +
  "}catch(e){}})()";

/** `darkAware` opts this instance into `dark:` variants. Set on both products now that kurl supports
 *  dark mode too (it was blog-only before the links dark sweep).
 *
 *  The banner is SERVER-rendered (initial `show` = true) so first-time visitors see it at first
 *  paint instead of a hydration-late beat after the page — as a localStorage-gated mount it also
 *  became the landing page's LCP element at ≈TTI under throttling, because the hero h1 never
 *  registers a paint-time LCP record (PR #710). Consented visitors are hidden pre-paint by the
 *  inline script above; hydration then flips `show` off and unmounts. */
export function CookieConsent({ darkAware = false }: { darkAware?: boolean }) {
  const t = useTranslations("cookieConsent");
  const locale = useLocale();
  const pathname = usePathname();
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (hasAcceptedConsent()) {
      // Also refreshes max-age and migrates legacy localStorage-only consent to the cookie.
      writeConsentCookie();
      setShow(false);
    }
  }, []);

  // Suppress on chrome-less surfaces (public profile pages) — visitors who land via someone's
  // bio link expect a clean preview, not a banner from a service they've never used.
  const suppressed = pathname.startsWith("/u/");

  // Flag the visible banner on <body> so fixed elements (the blog write FAB) and page padding can
  // make room for it on phones — see body[data-cookie-consent] in globals.css. Cleared on accept,
  // on suppressed surfaces, and on unmount.
  useEffect(() => {
    if (typeof document === "undefined") return;
    // The consent re-check guards the first post-hydration pass for already-consented visitors:
    // `show` is still true there (the unmount effect hasn't re-rendered yet) and would otherwise
    // re-flag the body for one frame.
    if (show && !suppressed && !hasAcceptedConsent()) {
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
    writeConsentCookie();
    setShow(false);
  }

  return (
    <>
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: consentInitScript }}
      />
      <div
        data-cc-banner
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
          "glass-chrome glass-lip mx-auto flex max-w-3xl items-center gap-2 border-t border-slate-200/60 px-4 py-3 shadow-[0_-6px_20px_-12px_rgba(15,23,42,0.25)] sm:ml-auto sm:mr-0 sm:max-w-[520px] sm:gap-3 sm:rounded-lg sm:border sm:px-3.5 sm:py-3 sm:shadow-md",
          darkAware && "dark:border-slate-800/60",
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
    </>
  );
}
