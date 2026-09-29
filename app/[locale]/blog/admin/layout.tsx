import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MessagesScope } from "@/i18n/messages-scope";

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
  return (
    <MessagesScope locale={locale} scope="blog/admin">
      {children}
    </MessagesScope>
  );
}
