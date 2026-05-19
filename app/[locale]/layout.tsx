import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "../globals.css";

/*
 * Display serif for English-leaning hero headlines and brand statements. Picked over Inter /
 * Geist / system sans because the landing page was reading as a generic SaaS template — the
 * recurring "AI slop" report. A single distinctive serif weight, locked to the hero copy, gives
 * the page an editorial anchor without overspending the typographic budget elsewhere (Pretendard
 * still owns Korean body and most UI chrome). Loaded via next/font/google so it self-hosts on
 * Vercel, ships as woff2, and emits the font-face with `font-display: swap` automatically — no
 * FOIT, no layout shift from the variable-width fallback because we limit usage to display sizes
 * where the metrics adjustment is imperceptible.
 */
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display-serif",
  display: "swap",
});

/*
 * Distinctive mono for eyebrows, URLs, tabular numerics, and `<code>` chrome. Previously these
 * fell through to system mono (SF Mono on macOS, generic monospace elsewhere) which gave each OS
 * a different look — the same shorten-result card rendered noticeably different on Windows vs
 * macOS. JetBrains Mono ships a tighter glyph rhythm than Menlo and the ligatures stay off by
 * default, so the mono surfaces (live click feed timestamps, status pills, custom-domain rows)
 * read consistently regardless of the visitor's OS.
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});
import { Footer } from "@/components/footer";
import { CookieConsent } from "@/components/cookie-consent";
import { ClaimToastListener } from "@/components/claim-toast-listener";
import { Nav } from "@/components/nav";
import { ToastProvider } from "@/components/ui/toast";
import { PostHogProvider } from "@/components/posthog-provider";
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
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    robots: { index: true, follow: true },
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
    ],
  };

  return (
    <html
      lang={locale}
      className={`${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Preconnect to the Pretendard CDN ahead of the stylesheet request — saves the TLS
            handshake (~150ms on mobile) for the Korean body font, which is on the LCP path. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <NextIntlClientProvider locale={locale}>
          <PostHogProvider>
            <ToastProvider>
              <Nav />
              <main className="flex-1">{children}</main>
              <Footer />
              <CookieConsent />
              <ClaimToastListener />
            </ToastProvider>
          </PostHogProvider>
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
  );
}
