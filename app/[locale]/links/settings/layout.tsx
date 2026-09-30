import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { messagesScopeLayout } from "@/i18n/messages-scope";
import { LINKS_TITLE_TEMPLATE } from "@/lib/page-title";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  return {
    title: { default: t("title"), template: LINKS_TITLE_TEMPLATE },
    robots: { index: false, follow: false },
  };
}

export default messagesScopeLayout("links/settings");
