import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { messagesScopeLayout } from "@/i18n/messages-scope";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });
  return {
    title: `${t("title")} · kurl`,
    description: t("subtitle"),
    robots: { index: false, follow: true },
  };
}

export default messagesScopeLayout("links/login");
