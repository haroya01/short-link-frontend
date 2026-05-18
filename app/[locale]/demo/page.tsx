import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DemoStatsPage } from "./_components/DemoStatsPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "demo" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

/**
 * Public {@code /demo} route. Renders the dashboard's {@code /stats/[code]} surface verbatim
 * against synthetic data, so visitors can scroll through the exact 5 tabs (overview, traffic,
 * sources, audience, settings), the same Header, same StatsCards, same heatmap, with no
 * sign-up. A thin sample banner at the top is the only visible difference; everything below it
 * is byte-for-byte the components the real route uses (see {@code StatsBody}).
 */
export default function DemoPage() {
  return <DemoStatsPage />;
}
