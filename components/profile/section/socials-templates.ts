import type { ShareChannel } from "@/types";

/**
 * URL prefix we prefill into the input when the user activates a channel chip — so they only need
 * to type their handle. Kept as a shared util because the profile-section autosave also needs to
 * treat "value === prefix" as "still drafting" and skip the save.
 */
export function socialUrlPrefix(channel: ShareChannel): string {
  switch (channel) {
    case "x":
      return "https://x.com/";
    // LINE 친구추가 intent — `~` 가 "LINE ID 로 추가" 토큰 prefix. 없으면 sharelink 토큰 형식으로
    // 해석돼 친구추가 안 됨. 사용자는 자기 LINE ID 만 뒤에 붙이면 OK.
    case "line":
      return "https://line.me/ti/p/~";
    case "threads":
      return "https://threads.net/@";
    case "facebook":
      return "https://facebook.com/";
    // 카카오톡 채널 (1:1 채팅 가능한 비즈니스 채널) URL. 개인 카톡 프로필은 URL 공유가 불가능하므로
    // 채널을 만든 사용자만 의미 있음 — 편집기 placeholder 에서 명시.
    case "kakao":
      return "https://pf.kakao.com/_";
    case "instagram":
      return "https://instagram.com/";
    case "linkedin":
      return "https://linkedin.com/in/";
  }
}
