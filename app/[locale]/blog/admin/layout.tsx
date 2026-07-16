import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { adminClientMessages } from "@/i18n/client-namespaces";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "abuseReports" });
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

export default async function BlogAdminLayout({ children }: { children: React.ReactNode }) {
  // 루트 프로바이더가 뺀 admin 전용 네임스페이스를 관리자 세그먼트에서 공급.
  return (
    <NextIntlClientProvider messages={adminClientMessages(await getMessages())}>
      {children}
    </NextIntlClientProvider>
  );
}
