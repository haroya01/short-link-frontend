import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "qrCampaigns.meta" });
  return {
    title: t("title"),
    description: t("description"),
    // 명시 안 하면 root layout 의 `${SITE_URL}/${locale}` 가 상속돼서 Lighthouse 가
    // "canonical 이 다른 hreflang 위치를 가리킴" 경고. self URL 박아서 SEO 점수 회복.
    alternates: { canonical: `${SITE_URL}/${locale}/qr-campaigns` },
  };
}

export default async function QrCampaignsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "qrCampaigns.meta" });
  // Service JSON-LD — gives Google a structured signal that this page is the marketing surface
  // for a specific offering (QR campaign tracking), distinct from the generic url-shortener
  // node on the home page. Lets the SERP show the page as a service result for "QR 추적",
  // "전단지 QR", etc. instead of just a sub-page of kurl.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: t("title"),
    description: t("description"),
    url: `${SITE_URL}/${locale}/qr-campaigns`,
    provider: { "@type": "Organization", name: "kurl", url: SITE_URL },
    areaServed: locale === "ko" ? "KR" : locale === "ja" ? "JP" : "Worldwide",
    inLanguage: locale,
  };
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
