import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
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

export default async function BlogAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // links/layout 과 같은 함정 방지 — 정적 렌더에서 세그먼트 레이아웃은 로케일을 스스로 고정해야
  // getMessages() 가 defaultLocale 로 떨어지지 않는다.
  const { locale } = await params;
  setRequestLocale(locale);
  // 루트 프로바이더가 뺀 admin 전용 네임스페이스를 관리자 세그먼트에서 공급.
  return (
    <NextIntlClientProvider messages={adminClientMessages(await getMessages())}>
      {children}
    </NextIntlClientProvider>
  );
}
