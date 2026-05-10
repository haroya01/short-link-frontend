import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "../globals.css";
import { Footer } from "@/components/footer";
import { CookieConsent } from "@/components/cookie-consent";
import { ClaimToastListener } from "@/components/claim-toast-listener";
import { Nav } from "@/components/nav";
import { ToastProvider } from "@/components/ui/toast";
import { routing } from "@/i18n/routing";

// SITE_URL is the canonical brand domain (used in og:url, canonical, JSON-LD).
// FRONTEND_URL is where the SPA actually lives — Next.js generates opengraph-image at this host,
// so it MUST be the metadataBase. When sharing kurl.me in Slack/Kakao, the scraper follows the
// 302 to app.kurl.me/{locale} where it finds these tags; the og:image is absolute and reachable.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kurl.me";
const FRONTEND_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://app.kurl.me");

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

  // Resolve opengraph-image to FRONTEND_URL so scrapers (Kakao/Slack) can actually fetch it —
  // the apex kurl.me serves redirects, not images.
  const ogImageUrl = `${FRONTEND_URL}/${locale}/opengraph-image`;
  return {
    metadataBase: new URL(FRONTEND_URL),
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
    <html lang={locale}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <NextIntlClientProvider locale={locale}>
          <ToastProvider>
            <Nav />
            <main className="flex-1">{children}</main>
            <Footer />
            <CookieConsent />
            <ClaimToastListener />
          </ToastProvider>
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
