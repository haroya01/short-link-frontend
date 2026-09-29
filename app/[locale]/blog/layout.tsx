import type { Metadata } from "next";
import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { MessagesScope } from "@/i18n/messages-scope";
import { IOS_APP_ID } from "@/lib/app-store";
import { BlogChrome } from "./blog-chrome";

export const metadata: Metadata = { itunes: { appId: IOS_APP_ID.blog } };

/**
 * 블로그 세그먼트의 서버 레이아웃 — 블로그 클라이언트 컴포넌트가 쓰는 메시지 스코프를 싣고,
 * 경로별 셸 분기는 blog-chrome.tsx 가 맡는다(클라이언트 레이아웃에선 메시지를 못 싣는다).
 */
export default async function BlogLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <MessagesScope locale={locale} scope="blog">
      <BlogChrome>{children}</BlogChrome>
    </MessagesScope>
  );
}
