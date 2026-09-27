import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blogLogin" });
  return {
    title: `${t("title")} · kurl log`,
    description: t("subtitle"),
    robots: { index: false, follow: true },
  };
}

export default function BlogLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
