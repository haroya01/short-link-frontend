import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { linksClientMessages } from "@/i18n/client-namespaces";
import { LinksChrome } from "./links-chrome";

/**
 * links 세그먼트의 서버 레이아웃 — 루트 프로바이더가 뺀 links 전용 네임스페이스(캠페인·QR·
 * 단축폼 등)를 여기서 공급한다(중첩 프로바이더는 messages 대체라 공용분 포함 세트로).
 * 클라이언트 크롬(경로별 셸 분기)은 links-chrome.tsx 로 분리 — 클라이언트 레이아웃에선
 * getMessages 를 못 부른다.
 */
export default async function LinksLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // 정적 렌더에서 레이아웃은 병렬 렌더 — 루트의 setRequestLocale 이 여기까지 오지 않아,
  // 이 호출 없이는 getMessages() 가 defaultLocale(ko)로 떨어져 en/ja/vi/hi 정적 HTML 에
  // 한국어 카탈로그가 실렸다(#881 이후 전 links 표면 회귀). 세그먼트 레이아웃도 각자 고정한다.
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <NextIntlClientProvider messages={linksClientMessages(await getMessages())}>
      <LinksChrome>{children}</LinksChrome>
    </NextIntlClientProvider>
  );
}
