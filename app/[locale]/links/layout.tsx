import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { linksClientMessages } from "@/i18n/client-namespaces";
import { LinksChrome } from "./links-chrome";

/**
 * links 세그먼트의 서버 레이아웃 — 루트 프로바이더가 뺀 links 전용 네임스페이스(캠페인·QR·
 * 단축폼 등)를 여기서 공급한다(중첩 프로바이더는 messages 대체라 공용분 포함 세트로).
 * 클라이언트 크롬(경로별 셸 분기)은 links-chrome.tsx 로 분리 — 클라이언트 레이아웃에선
 * getMessages 를 못 부른다.
 */
export default async function LinksLayout({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider messages={linksClientMessages(await getMessages())}>
      <LinksChrome>{children}</LinksChrome>
    </NextIntlClientProvider>
  );
}
