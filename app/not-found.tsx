import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";
import vi from "@/messages/vi.json";
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
 * out of static rendering (every route built as per-request SSR, no edge cache). All three locale
 * copies render in the DOM and a pre-paint inline script + the globals.css [data-nf] rules pick
 * one from the cookie — same no-FOUC pattern as the theme/auth-hint scripts.
 */
const COPY: Record<string, { title: string; description: string; cta: string }> = {
  ko: ko.notFound,
  en: en.notFound,
  ja: ja.notFound,
  vi: vi.notFound,
  hi: hi.notFound,
};

const LOCALES = ["ko", "en", "ja", "vi", "hi"] as const;

const localeInitScript =
  "(function(){try{" +
  "var m=document.cookie.match(/(?:^|; )NEXT_LOCALE=(en|ja|vi|hi)/);" +
  "if(m){document.documentElement.lang=m[1];document.documentElement.setAttribute('data-nf-locale',m[1]);}" +
  "}catch(e){}})()";

export default function RootNotFound() {
  return (
    <html lang="ko">
      <head>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: localeInitScript }}
        />
      </head>
      <body className="bg-white text-slate-900 antialiased">
        {LOCALES.map((locale) => {
          const t = COPY[locale];
          return (
            <div key={locale} data-nf={locale} data-testid="not-found" className="container max-w-md py-24 text-center">
              <p className="font-mono text-[11px] uppercase tracking-tagline text-slate-500">404</p>
              <h1 className="mt-3 text-2xl font-semibold tracking-headline text-slate-900">
                {t.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{t.description}</p>
              <a
                href={`/${locale}`}
                className="mt-8 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
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
