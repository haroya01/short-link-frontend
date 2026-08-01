import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * 이 라우트는 /write?view=series 로 보내는 클라이언트 리다이렉트 껍데기다. 본문이 없는데도
 * index, follow 로 크롤링되고 있었고, 자기 canonical 이 없어 루트 레이아웃의 canonical
 * (= kurl.me/ko, 다른 호스트의 홈)을 물려받아 "apex 홈의 중복" 이라고 선언하고 있었다.
 * 페이지가 "use client" 라 metadata 를 못 내보내므로 레이아웃에서 막는다.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SeriesRedirectLayout({ children }: { children: ReactNode }) {
  return children;
}
