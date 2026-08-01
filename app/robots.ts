import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/dashboard",
          "/*/dashboard",
          "/admin",
          "/*/admin",
          "/settings",
          "/*/settings",
          "/stats/",
          "/*/stats/",
          "/auth/",
          "/*/auth/",
          "/api/",
          // Auth surfaces have no informational value as search entry points and crowd brand
          // sitelinks. Also noindex'd at the page layer (defense-in-depth) so a missed crawl
          // rule still keeps them out of the index.
          "/login",
          "/*/login",
          // 블로그 워크스페이스. 로그인해야 쓸모가 있는데도 크롤러에겐 열려 있었고, 자기 canonical 을
          // 선언하지 않아 루트 레이아웃의 canonical(= kurl.me/ko, 다른 호스트의 홈)을 그대로 물려받았다.
          // "이 페이지는 apex 홈의 중복" 이라고 선언하는 꼴이라 색인에서 통째로 접힐 수 있다.
          //
          // 시리즈는 여기 넣지 않는다 — 워크스페이스는 /{locale}/series 지만 공개 작가 시리즈는
          // /@{user}/series 라, /*/series 로 막으면 공개 표면까지 같이 끊긴다. 그쪽은 페이지
          // 레이어의 noindex 로 정확히 처리한다.
          "/write",
          "/*/write",
          "/drafts",
          "/*/drafts",
          "/analytics",
          "/*/analytics",
          "/notifications",
          "/*/notifications",
          "/curation",
          "/*/curation",
          "/leads",
          "/*/leads",
          "/webhooks",
          "/*/webhooks",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
