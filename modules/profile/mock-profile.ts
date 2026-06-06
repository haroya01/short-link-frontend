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

export function mockPublicProfile(username: string): PublicProfile {
  return {
    username,
    bio: "프로덕트 만들고 글 씁니다. 모든 링크는 여기에.",
    theme: null,
    avatarUrl: null,
    bannerUrl: null,
    socials: [],
    publishedPostCount: 12,
    entries: [
      link(1, "gh", `https://github.com/${username}`, "GitHub", 128, true),
      link(2, "x", `https://x.com/${username}`, "X (Twitter)", 64),
      link(3, "yt", "https://youtube.com/", "YouTube 채널", 42),
      link(4, "ml", `mailto:${username}@kurl.me`, "이메일", 18),
    ],
  };
}
