import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { ViewTransitions } from "next-view-transitions";
import { AuthHintProvider } from "@/components/common/auth-hint";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { JetBrains_Mono } from "next/font/google";
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

  // First-paint sign-in guess for the header (avoids the auth-dependent chrome flashing in on cold
  // load). The access token is per-origin localStorage (client-only), but the refresh cookie is
  // server-readable; its presence ≈ a recoverable session. Mocks have no real cookie, so assume authed
  // (the mock fixture is the signed-in demo user). The client `/me` reconciles either way.
  const initialAuthed =
    process.env.NEXT_PUBLIC_USE_MOCKS === "1" || cookies().has("refresh_token");

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
  const themeInitScript =
    "(function(){try{" +
    "var m=document.cookie.match(/(?:^|; )theme=(dark|light)/);var t=m?m[1]:localStorage.getItem('theme');" +
    "if(t==='dark'){document.documentElement.classList.add('dark');}" +
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
          <AuthHintProvider initialAuthed={initialAuthed}>{children}</AuthHintProvider>
        </NextIntlClientProvider>
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
