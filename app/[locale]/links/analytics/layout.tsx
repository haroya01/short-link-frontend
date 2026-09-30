import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { messagesScopeLayout } from "@/i18n/messages-scope";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "linkAnalytics" });
  return { title: t("title") };
}

export default messagesScopeLayout("links/analytics");
