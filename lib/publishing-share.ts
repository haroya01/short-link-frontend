/**
 * Publishing share URL helpers — 작성자 본인 공유 시 UTM 자동 부여 (spec decision #19).
 * 작성자 vs 독자의 share 를 구분해 분석 신호 정확히 잡음:
 *  - utm_source=author-share: 작성자가 자기 글 SNS 공유
 *  - utm_source=organic-share: 독자가 native share API 로 재유포 (현재는 별도 처리 없음)
 *  - utm_source=null: 직접 방문 (in-app browser referrer 안 나오는 경우 포함)
 */

export type SharePlatform =
  | "twitter"
  | "facebook"
  | "linkedin"
  | "kakaotalk"
  | "line"
  | "copy";

const PLATFORM_MEDIUM: Record<SharePlatform, string> = {
  twitter: "kurl_twitter",
  facebook: "kurl_facebook",
  linkedin: "kurl_linkedin",
  kakaotalk: "kurl_kakaotalk",
  line: "kurl_line",
  copy: "kurl_copy",
};

export function buildAuthorShareUrl(
  postUrl: string,
  postSlug: string,
  platform: SharePlatform,
): string {
  const url = new URL(postUrl);
  url.searchParams.set("utm_source", "author-share");
  url.searchParams.set("utm_medium", PLATFORM_MEDIUM[platform]);
  url.searchParams.set("utm_campaign", postSlug);
  return url.toString();
}

/** 플랫폼별 share intent URL (Twitter / FB / LinkedIn / KakaoTalk / LINE). */
export function buildSharePlatformIntent(
  shareUrl: string,
  title: string,
  platform: SharePlatform,
): string | null {
  switch (platform) {
    case "twitter":
      return `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    case "line":
      return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
    case "kakaotalk":
      // KakaoTalk 공식 sharing 은 Kakao SDK 필요 (별도 setup). web fallback 으로 copy intent.
      return null;
    case "copy":
      // copy 는 URL 만 필요. clipboard API 호출은 client component 에서.
      return null;
  }
}
