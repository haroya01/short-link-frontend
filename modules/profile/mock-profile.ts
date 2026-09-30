import type { PublicProfile, PublicProfileEntry } from "@/types";

/**
 * Demo link-in-bio for mock mode (NEXT_PUBLIC_USE_MOCKS=1) so the profile surface renders without a
 * backend — and the blog↔프로필 cross-link actually lands somewhere. Lives under modules/ (outside
 * the i18n-literal guard's roots) so the Korean copy here is allowed, mirroring the blog _mocks.
 */
function link(
  id: number,
  code: string,
  url: string,
  title: string,
  clicks: number,
  highlighted = false,
): PublicProfileEntry {
  return {
    kind: "LINK",
    id,
    shortCode: code,
    shortUrl: `https://kurl.me/${code}`,
    originalUrl: url,
    ogTitle: title,
    ogImage: null,
    clickCount: clicks,
    highlighted,
    content: null,
  };
}

// 표지가 있는 프로필을 백엔드 없이 그리기 위한 단색 표지(외부 이미지 없이 CI 에서도 뜬다).
const MOCK_BANNER =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='1500' height='500'><rect width='1500' height='500' fill='#1f3a2e'/></svg>",
  );

// 대표로 모집을 올린 프로필 — 공개 목록이 모집 카드를 맨 위에 대표로 그리는지 확인할 때 쓴다.
function featuredEvent(): PublicProfileEntry {
  return {
    kind: "EVENT",
    id: 900,
    shortCode: null,
    shortUrl: null,
    originalUrl: null,
    ogTitle: null,
    ogImage: null,
    clickCount: null,
    highlighted: true,
    content: JSON.stringify({ title: "주말 스터디 모집", startsAt: "2099-10-12T10:00:00+09:00", location: "성수" }),
  };
}

export function mockPublicProfile(username: string): PublicProfile {
  if (username === "featured-event") {
    const base = mockPublicProfile("dohyun");
    return {
      ...base,
      username,
      entries: [...base.entries.map((e) => ({ ...e, highlighted: false })), featuredEvent()],
    };
  }
  return {
    username,
    bio: "프로덕트 만들고 글 씁니다. 모든 링크는 여기에.",
    theme: null,
    avatarUrl: null,
    bannerUrl: MOCK_BANNER,
    socials: [],
    publishedPostCount: 12,
    hideFollowerCount: false,
    entries: [
      link(1, "gh", `https://github.com/${username}`, "GitHub", 128, true),
      link(2, "x", `https://x.com/${username}`, "X (Twitter)", 64),
      link(3, "yt", "https://youtube.com/", "YouTube 채널", 42),
      link(4, "ml", `mailto:${username}@kurl.me`, "이메일", 18),
    ],
  };
}
