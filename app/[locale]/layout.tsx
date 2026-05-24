import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
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
import { Footer } from "@/components/common/footer";
import { CookieConsent } from "@/components/common/cookie-consent";
import { ClaimToastListener } from "@/components/common/claim-toast-listener";
import { Nav } from "@/components/common/nav";
import { ToastProvider } from "@/components/ui/toast";
import { PostHogProvider } from "@/components/common/posthog-provider";
import { QueryProvider } from "@/components/common/query-provider";
import { AuthProvider } from "@/lib/auth";
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
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
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

  return (
    <html
      lang={locale}
      className={jetbrainsMono.variable}
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
          <QueryProvider>
            <AuthProvider>
              <PostHogProvider>
                <ToastProvider>
                  <Nav />
                  <main className="flex-1">{children}</main>
                  <Footer />
                  <CookieConsent />
                  <ClaimToastListener />
                </ToastProvider>
              </PostHogProvider>
            </AuthProvider>
          </QueryProvider>
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
