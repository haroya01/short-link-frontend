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
    case "line":
      return "https://line.me/ti/p/";
    case "threads":
      return "https://threads.net/@";
    case "facebook":
      return "https://facebook.com/";
    case "kakao":
      return "https://pf.kakao.com/_";
  }
}
