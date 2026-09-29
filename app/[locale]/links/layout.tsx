import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { MessagesScope } from "@/i18n/messages-scope";
import { IOS_APP_ID } from "@/lib/app-store";
import { LinksChrome } from "./links-chrome";

// iPhone Safari 스마트 앱 배너. 공개 프로필(/u)·모집(/e)은 이 세그먼트 밖이라 배너가 붙지 않는다.
export const metadata: Metadata = { itunes: { appId: IOS_APP_ID.links } };

/**
 * links 세그먼트의 서버 레이아웃 — 크롬과 홈이 쓰는 메시지 스코프를 싣는다(하위 화면 문구는 각
 * 화면 레이아웃의 스코프가 얹는다, i18n/client-namespaces.ts). 클라이언트 크롬(경로별 셸 분기)은
 * links-chrome.tsx 로 분리 — 클라이언트 레이아웃에선 메시지를 못 싣는다.
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
    <MessagesScope locale={locale} scope="links">
      <LinksChrome>{children}</LinksChrome>
    </MessagesScope>
  );
}
