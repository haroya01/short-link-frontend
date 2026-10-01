import { NotFoundLocaleSync } from "@/components/common/not-found-locale-sync";
import { NotFoundThemeSync } from "@/components/common/not-found-theme-sync";
import { routing } from "@/i18n/routing";
import { serializeJsonLd } from "@/lib/json-ld";
import { applyNotFoundLocale } from "@/lib/not-found-locale";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";
import vi from "@/messages/vi.json";
import { Mark } from "@/components/common/logo";
import { themeCookieNameScript } from "@/lib/theme-cookie";
import "./globals.css";

/**
 * Root not-found — the fallback for any request that doesn't resolve under the [locale] segment.
 * Without it, Next renders its built-in plain "404 This page could not be found", which differs
 * from the branded [locale]/not-found.tsx and lets a prober tell real routes apart by 404 style.
 * This makes every unmatched path render the same branded 404.
 *
 * It must ship its own <html>/<body> + globals.css: there is no root app/layout.tsx (the locale
 * layout owns the document), so this renders standalone.
 *
 * STATIC on purpose: this used to read the NEXT_LOCALE cookie via cookies(), and because the root
 * not-found boundary renders into every page tree, that single dynamic read opted THE ENTIRE APP
 * out of static rendering (every route built as per-request SSR, no edge cache). Every locale's
 * copy renders in the DOM; a pre-paint inline script flags one on <html> and the style below shows
 * it — same no-FOUC pattern as the theme/auth-hint scripts. The copy table, the script's locale
 * list and the style rules all derive from routing.locales, so a new locale cannot be half-added.
 */
type Locale = (typeof routing.locales)[number];

const COPY: Record<Locale, { title: string; description: string; cta: string }> = {
  ko: ko.notFound,
  en: en.notFound,
  ja: ja.notFound,
  vi: vi.notFound,
  hi: hi.notFound,
};

const LOCALES: readonly Locale[] = routing.locales;
const FALLBACK: Locale = routing.defaultLocale;
const TITLES: Record<string, string> = Object.fromEntries(
  LOCALES.map((locale) => [locale, `${COPY[locale].title} · kurl`]),
);

const localeInitScript = `(${applyNotFoundLocale.toString()})(${JSON.stringify(LOCALES)},${JSON.stringify(FALLBACK)},${serializeJsonLd(TITLES)})`;

const localeStyle =
  "[data-nf]{display:none}" +
  `html:not([data-nf-locale]) [data-nf="${FALLBACK}"]{display:block}` +
  LOCALES.map((locale) => `html[data-nf-locale="${locale}"] [data-nf="${locale}"]{display:block}`).join("");

/* No-FOUC 테마 — 이 문서는 로케일 레이아웃 밖에서 렌더돼 그쪽 테마 스크립트를 못 탄다.
   빠뜨리면 다크 사용자가 404 를 라이트로 맞는다(만료 링크·오타 URL 이 흔한 진입).
   쿠키 이름은 [locale]/layout.tsx 와 같은 themeCookieNameScript(lib/theme-cookie.ts)가 고른다 —
   블로그 표면=`theme`, kurl 표면(명함 {user}.kurl.me 포함)=`kurl_theme`. */
const PLATFORM_HOST = process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me";
const themeInitScript =
  "(function(){try{" +
  "var h=location.hostname,P=" +
  JSON.stringify(PLATFORM_HOST) +
  ",onP=(h===P||h.endsWith('.'+P));" +
  themeCookieNameScript +
  "var m=document.cookie.match(new RegExp('(?:^|; )'+n+'=(dark|light)'));" +
  "var t=m?m[1]:(onP?null:localStorage.getItem(n));" +
  "if(t==='dark'){document.documentElement.classList.add('dark');}" +
  "}catch(e){}})()";

export default function RootNotFound() {
  return (
    <html lang={FALLBACK}>
      <head>
        <title>{TITLES[FALLBACK]}</title>
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: localeStyle }} />
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: localeInitScript + ";" + themeInitScript }}
        />
      </head>
      <body className="bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <NotFoundLocaleSync locales={LOCALES} fallback={FALLBACK} titles={TITLES} />
        <NotFoundThemeSync />
        {LOCALES.map((locale) => {
          const t = COPY[locale];
          return (
            <div key={locale} lang={locale} data-nf={locale} data-testid="not-found" className="container max-w-md py-24 text-center">
              {/* 주 방문자는 만료된 단축 링크로 온 첫 방문자 — 발신자 서명으로 마크 하나만. */}
              <Mark className="mx-auto h-5 w-auto text-accent-600 dark:text-accent-400" />
              <p className="mt-6 font-mono text-[12px] font-medium text-slate-500 dark:text-slate-400">404</p>
              <h1 className="mt-3 text-2xl font-semibold tracking-headline text-slate-900 dark:text-slate-100">
                {t.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t.description}</p>
              <a
                href={`/${locale}`}
                className="mt-8 focus-ring inline-flex h-10 items-center justify-center rounded-lg bg-accent-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-800"
              >
                {t.cta}
              </a>
            </div>
          );
        })}
      </body>
    </html>
  );
}
