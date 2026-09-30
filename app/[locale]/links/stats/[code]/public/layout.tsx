import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: "publicStats" });
  return {
    title: `/${code} · ${t("title")}`,
    robots: { index: false, follow: false },
  };
}

export default function PublicStatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
