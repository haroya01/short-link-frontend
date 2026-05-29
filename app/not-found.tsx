import { cookies } from "next/headers";
import "./globals.css";

/**
 * Root not-found — the fallback for any request that doesn't resolve under the [locale] segment.
 * Without it, Next renders its built-in plain "404 This page could not be found", which differs
 * from the branded [locale]/not-found.tsx and lets a prober tell real routes apart by 404 style.
 * This makes every unmatched path render the same branded 404.
 *
 * It must ship its own <html>/<body> + globals.css: there is no root app/layout.tsx (the locale
 * layout owns the document), so this renders standalone. Copy is inlined per-locale (no
 * NextIntlClientProvider here) and chosen from the NEXT_LOCALE cookie.
 */
const COPY: Record<string, { title: string; description: string; cta: string }> = {
  ko: {
    title: "이 페이지를 찾을 수 없어요",
    description: "주소를 잘못 입력했거나, 단축 링크가 만료됐거나, 존재하지 않는 페이지일 수 있어요.",
    cta: "홈으로 돌아가기",
  },
  en: {
    title: "Page not found",
    description:
      "The address may be wrong, the short link may have expired, or the page may not exist.",
    cta: "Back to home",
  },
  ja: {
    title: "ページが見つかりません",
    description: "URLが間違っているか、短縮リンクが期限切れか、存在しないページの可能性があります。",
    cta: "ホームへ戻る",
  },
};

export default async function RootNotFound() {
  const store = await cookies();
  const locale = store.get("NEXT_LOCALE")?.value ?? "ko";
  const t = COPY[locale] ?? COPY.ko;
  return (
    <html lang={locale}>
      <body className="bg-white text-slate-900 antialiased">
        <div className="container max-w-md py-24 text-center">
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
      </body>
    </html>
  );
}
