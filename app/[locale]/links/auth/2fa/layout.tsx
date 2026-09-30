import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.twofa" });
  return { title: t("title") };
}

export default function TwoFactorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
