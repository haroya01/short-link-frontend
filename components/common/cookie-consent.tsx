"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import {
  CONSENT_COOKIE,
  LEGACY_CONSENT_STORAGE_KEY,
  hasSettledConsent,
  readConsent,
  writeConsent,
} from "@/lib/cookie-consent";
import { linksHref } from "@/lib/host";
import { cn } from "@/lib/utils";

// Runs during HTML parse, before the banner below it can paint (same no-FOUC trick as the theme
// script in the root layout). Consented visitors — cookie, or the legacy localStorage flag — get
// `data-cc-accepted` on <html>, and the globals.css rule hides the banner until hydration unmounts
// it. Everyone else gets the body flag that reserves scroll room for the fixed bar. The flag can't
// leak onto suppressed surfaces because those never render this component, and so never ship this
// script.
// 동의든 거부든 "한 번 골랐으면" 배너를 감춘다. 속성 이름은 data-cc-accepted 그대로 둔다 —
// globals.css 가 그 이름으로 잡고 있고, 의미는 "이 방문자는 결정을 끝냈다" 이다.
const consentInitScript =
  "(function(){try{" +
  `var ok=/(?:^|; )${CONSENT_COOKIE}=(accepted|rejected)/.test(document.cookie)||localStorage.getItem('${LEGACY_CONSENT_STORAGE_KEY}')==='accepted';` +
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
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const settled = readConsent();
    if (settled) {
      // Also refreshes max-age and migrates legacy localStorage-only consent to the cookie.
      writeConsent(settled);
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
    if (show && !suppressed && !hasSettledConsent()) {
      document.body.dataset.cookieConsent = "visible";
    } else {
      delete document.body.dataset.cookieConsent;
    }
    return () => {
      delete document.body.dataset.cookieConsent;
    };
  }, [show, suppressed]);

  // Publish the banner's real height so the page can reserve room for it. A fixed bar can't be
  // measured from CSS, and the copy wraps to two lines in some locales / widths, so a hard-coded
  // constant under-reserves and the bar ends up sitting on the footer links — the reported
  // "푸터가 안 눌려요". ResizeObserver keeps it right through locale switches and font loads.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const publish = () =>
      document.body.style.setProperty(
        "--cookie-banner-h",
        `${Math.ceil(el.getBoundingClientRect().height)}px`,
      );
    publish();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(publish);
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      document.body.style.removeProperty("--cookie-banner-h");
    };
  }, [show, suppressed]);

  if (suppressed) return null;
  if (!show) return null;

  function choose(value: "accepted" | "rejected") {
    // writeConsent 가 쿠키를 쓰고 CONSENT_CHANGE_EVENT 를 쏜다 — PostHog 는 그 이벤트로 켜지거나
    // (거부면) 즉시 멈추고 남은 식별자까지 지운다. 배너는 상태를 저장할 뿐 SDK 를 직접 만지지 않는다.
    writeConsent(value);
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
        // pointer-events-none 은 장식이 아니라 버그 수리다. 이 래퍼는 inset-x-0 이라 화면 전폭을
        // 차지하는데, 안의 카드는 sm+ 에서 오른쪽 520px 뿐이다. 래퍼가 클릭을 받으면 카드가 없는
        // 왼쪽 전체(1440 에서 904px, 2560 에서 2024px)가 65px 높이의 투명한 클릭 차단막이 된다 —
        // 그 띠에 걸린 피드 카드·버튼이 "눌러도 아무 일 없는" 상태가 됐다. 토스트 래퍼와 같은 처방.
        /* 모바일 bottom 은 --cookie-bottom + 0.5rem — 플로팅 카드라 탭바 독과 한 숨 띄운다.
           이 0.5rem 은 globals.css 의 body[data-cookie-consent] 하단 예약과 짝. */
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--cookie-bottom)+0.5rem)] z-40 sm:bottom-4 sm:px-4"
      >
      {/* Phones: 하단 탭바 독과 같은 플로팅 글래스 캡슐(inset 12px·rounded-2xl·동일 섀도우) —
          엣지-투-엣지 슬랩은 상하단 캡슐 크롬 사이에서 혼자 문법을 깼다. sm+: 우측 정렬 카드. */}
      <div
        ref={cardRef}
        className={cn(
          // pointer-events-auto 는 래퍼의 pointer-events-none 과 짝이다 — 래퍼가 전폭이라
          // 클릭을 받으면 카드 없는 왼쪽이 투명한 차단막이 된다.
          // 폰에선 문구 아래로 버튼 줄을 내린다 — 버튼이 둘이 되면서 한 줄에 다 넣으면 문구가
          // 서너 글자 폭으로 눌린다. sm+ 는 지금처럼 한 줄.
          "pointer-events-auto glass-chrome mx-3 flex flex-col gap-2 rounded-2xl border border-slate-200/60 px-4 py-3 shadow-[0_8px_28px_-16px_rgba(15,23,42,0.28)] sm:ml-auto sm:mr-0 sm:max-w-[560px] sm:flex-row sm:items-center sm:gap-3 sm:px-3.5 sm:py-3",
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
        <div className="flex shrink-0 items-center justify-end gap-2">
          <a
            href={linksHref(`/${locale}/privacy`)}
            className={cn(
              "mr-1 text-xs text-slate-500 underline hover:text-slate-700",
              darkAware && "dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {t("learnMore")}
          </a>
          {/* 거부와 동의는 같은 크기·같은 모양이다. 동의는 "자유롭게 주어진" 것이어야 해서 거부가
              동의만큼 쉬워야 하고, 한쪽만 눈에 띄게 만들면 그 조건이 깨진다. 채움/테두리 차이는
              어느 쪽이 기본값인지가 아니라 두 버튼을 구분하기 위한 것이다. */}
          <button
            type="button"
            onClick={() => choose("rejected")}
            className={cn(
              "focus-ring rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 sm:px-4 sm:py-2 sm:text-xs",
              darkAware &&
                "dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800",
            )}
          >
            {t("reject")}
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className={cn(
              // border-transparent: 거부 버튼에만 테두리가 있으면 같은 padding 이라도 2px 더 높다.
              // 두 선택지의 높이가 어긋나면 "같은 급" 이라는 인상이 깨진다.
              "focus-ring rounded-full border border-transparent bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-slate-800 sm:px-4 sm:py-2 sm:text-xs",
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
