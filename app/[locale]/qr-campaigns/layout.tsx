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

export default function QrCampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
