import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { ViewTransitions } from "next-view-transitions";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { JetBrains_Mono } from "next/font/google";
import { ImageFade } from "@/components/common/image-fade";
import { OfflineBanner } from "@/components/common/offline-banner";
import "../globals.css";

/*
 * Distinctive mono for eyebrows, URLs, tabular numerics, and `<code>` chrome. Previously these
 * fell through to system mono (SF Mono on macOS, generic monospace elsewhere) which gave each OS
 * a different look — the same shorten-result card rendered noticeably different on Windows vs
 * macOS. JetBrains Mono ships a tighter glyph rhythm than Menlo and the ligatures stay off by
 * default, so the mono surfaces (live click feed timestamps, status pills, custom-domain rows)
 * read consistently regardless of the visitor's OS.
 *
 * Sans body / heading is Pretendard (loaded via the CDN stylesheet below). One sans family across
 * Korean / English / Japanese keeps the typographic voice consistent — Pretendard ships proper
 * Latin glyphs at every weight, so we don't need a second display face for the hero. Headlines
 * lean on weight (600/700) + tight tracking (`-0.025em` via `.tracking-headline`) for editorial
 * density instead of a display swap.
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});
import { routing } from "@/i18n/routing";

// Single canonical domain. Cloudflare Worker (kurl-router) routes kurl.me/* to either the
// backend (short-codes + /api/*) or Vercel (frontend pages) so users only ever see the apex
// brand domain. og:url / canonical / sitemap all align with what visitors share — Kakao
// previously dropped previews when og:url host mismatched, and SEO canonicals pointed at
// 404 pages on the host that didn't actually serve the path. Worker landed 2026-05-13.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t("title");
  const description = t("description");
  const localeAlternates = Object.fromEntries(
    routing.locales.map((l) => [l, `${SITE_URL}/${l}`]),
  );

  const ogImageUrl = `${SITE_URL}/${locale}/opengraph-image`;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: { ...localeAlternates, "x-default": `${SITE_URL}/${routing.defaultLocale}` },
    },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/${locale}`,
      siteName: "kurl",
      title,
      description,
      locale: locale === "ko" ? "ko_KR" : locale === "ja" ? "ja_JP" : "en_US",
      images: [{ url: ogImageUrl, width: 2400, height: 1260, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      // Brand-account attribution (@handle) — env-gated so it's omitted until a real handle is set,
      // rather than shipping a guessed one. Mirrors the verification-token pattern below.
      ...(process.env.NEXT_PUBLIC_TWITTER_SITE
        ? { site: process.env.NEXT_PUBLIC_TWITTER_SITE }
        : {}),
      title,
      description,
      images: [ogImageUrl],
    },
    robots: { index: true, follow: true },
    // Search-engine ownership tokens. Naver dominates Korean search (~50% share) and requires
    // explicit verification via Search Advisor; without it the site is invisible in Naver
    // results regardless of how good Google indexing is. Tokens injected via env so secrets
    // don't live in the repo — empty env vars cause the meta tag to be omitted entirely.
    verification: {
      ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
        ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
        : {}),
      ...(process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
        ? {
            other: {
              "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION,
            },
          }
        : {}),
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // First-paint sign-in guess for the header — used to live here as cookies().has("refresh_token"),
  // but ONE dynamic-API read in the root layout forced EVERY route in the app into per-request
  // rendering (no edge cache, ~0.5–1.3s TTFB on all public pages). The guess now comes from a
  // pre-paint inline script (authHintScript below) reading the per-origin localStorage access
  // token, with the header CSS-gating both chrome variants until the client /me settles. Cost: a
  // visitor whose session lives only in the cross-subdomain refresh cookie (first hop to a new
  // subdomain) briefly sees the signed-out chrome — same-origin repeat visits stay flash-free.
  const authHintScript =
    process.env.NEXT_PUBLIC_USE_MOCKS === "1"
      ? // Mock fixture is the signed-in demo user; no real token exists on first load.
        "document.documentElement.dataset.authHint='1';"
      : "if(localStorage.getItem('short-link:access-token')){document.documentElement.dataset.authHint='1';}";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "kurl",
        url: SITE_URL,
        logo: `${SITE_URL}/icon.svg`,
      },
      {
        "@type": "WebSite",
        url: SITE_URL,
        name: "kurl",
        inLanguage: locale,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/${locale}?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      // SoftwareApplication node lets the brand-name query show the product card panel on the
      // right (description + screenshot + free price + category). Without this Google can only
      // infer "website" from the WebSite node above and the SERP loses a major brand surface.
      {
        "@type": "SoftwareApplication",
        name: "kurl",
        url: SITE_URL,
        applicationCategory: "WebApplication",
        operatingSystem: "Any",
        inLanguage: locale,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "KRW",
        },
      },
    ],
  };

  // No-FOUC theme. Dark mode is now supported on BOTH products (blog + kurl/links — the links surfaces
  // carry `dark:` variants as of the P1–P3 sweep), so we apply `.dark` on every surface, gated only on
  // the reader's EXPLICIT choice: the shared `.kurl.me` cookie FIRST (so the apex + author subdomains
  // agree), then the per-origin localStorage fallback. We deliberately do NOT auto-darken from the OS
  // `prefers-color-scheme` — that flipped surfaces inconsistently across hosts and read as "it forced
  // dark mode on me." (Earlier this was scoped to blog-only because the links product had no dark styles
  // and `.dark` painted its root slate-950 over un-themed UI; that scoping is no longer needed.)
  // The auth hint shares this tag: a second standalone inline <script> in <head> was dropped from
  // the streamed head on some routes (React head reconciliation), so both pre-paint flags ride the
  // one tag that's proven to survive everywhere.
  // The choice is a `.kurl.me` cookie shared across the apex feed + author subdomains. localStorage is
  // per-origin, so ON the platform (any *.kurl.me) we must NOT fall back to it: a stale 'dark' left in one
  // subdomain's localStorage would paint a post ({author}.kurl.me) dark while the shared cookie — and the
  // feed (blog.kurl.me) — are light. So on-platform the shared cookie is the SOLE source of truth (light is
  // the safe default when it's absent, e.g. after iOS Safari's 7-day script-cookie cap expires); only
  // off-platform (localhost / Vercel previews, a single origin) does the localStorage fallback still apply.
  const platformHost = process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me";
  const themeInitScript =
    "(function(){try{" +
    "var h=location.hostname,P=" + JSON.stringify(platformHost) + ",onP=(h===P||h.endsWith('.'+P));" +
    "var m=document.cookie.match(/(?:^|; )theme=(dark|light)/);" +
    "var t=m?m[1]:(onP?null:localStorage.getItem('theme'));" +
    "if(t==='dark'){document.documentElement.classList.add('dark');}" +
    // Safari(ITP)는 스크립트가 쓴 쿠키를 7일로 캡한다 — 방문할 때마다 같은 값으로 재기입해
    // 창을 밀어 둔다(주 1회만 와도 선택이 유지). 서버 Set-Cookie 경유가 정석이지만 /api/* 는
    // 프록시 계층에서 백엔드로 넘어갈 수 있어 여기서 처리한다.
    "if(m){document.cookie='theme='+m[1]+'; path=/; max-age=31536000; samesite=lax'+(onP?'; domain=.'+P:'');}" +
    authHintScript +
    "}catch(e){}})()";

  return (
    <ViewTransitions>
    <html
      lang={locale}
      className={jetbrainsMono.variable}
      suppressHydrationWarning
    >
      <head>
        {/* No-FOUC theme — see themeInitScript above. Sets `.dark` on <html> before paint, but ONLY on
            blog surfaces, so the links product never inherits a dark root it has no styles for. */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        {/* Pretendard (Korean body font) loaded ASYNC, not render-blocking. It used to be a blocking
            <link rel=stylesheet> from jsdelivr (~1s render-block on mobile) and, because the feed's LCP
            element is TEXT, that delay landed straight on LCP. Now: preconnect + preload warm the
            request, the stylesheet ships as media="print" (non-blocking) so the page paints
            immediately in the system fallback, and a tiny inline script flips it to media="all" once
            loaded — upgrading to Pretendard without ever blocking first paint. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* PostHog warms up off the critical path, but its first config/flags fetches still paid
            full DNS+TLS on mobile (~660ms est. in Lighthouse). us-assets serves plain <script>
            loads (no-cors), us.i is fetch/XHR (cors) — hence the crossOrigin split. */}
        <link rel="preconnect" href="https://us-assets.i.posthog.com" />
        <link rel="preconnect" href="https://us.i.posthog.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          media="print"
          data-pretendard=""
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var l=document.querySelector('link[data-pretendard]');if(!l)return;var a=function(){l.media='all'};if(l.sheet)a();else l.addEventListener('load',a,{once:true});})();",
          }}
        />
        <noscript>
          {/* JS off → ship it as a normal blocking stylesheet so the font still applies. */}
          {/* eslint-disable-next-line @next/next/no-css-tags */}
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          />
        </noscript>
      </head>
      <body className="min-h-screen flex flex-col">
        <NextIntlClientProvider locale={locale}>
          <OfflineBanner />
          {children}
        </NextIntlClientProvider>
        {/* Load-fade marker for lazy content images (img.img-fade) — see the component doc. */}
        <ImageFade />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Privacy-friendly analytics — no cookies, no PII collection. Matches the cookie banner
            promise of "no analytics cookies." */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
    </ViewTransitions>
  );
}
