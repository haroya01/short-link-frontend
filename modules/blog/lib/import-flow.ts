import { ApiError } from "@/lib/api/client";
import { dateLocale } from "@/lib/date";
import type { ImportPlatform, ImportProgress, ImportSource } from "@/modules/blog/api/imports";

export type ImportStep = "verify" | "progress" | "done" | "error";

export function importStep(source: Pick<ImportSource, "status">): ImportStep {
  switch (source.status) {
    case "PENDING_VERIFICATION":
      return "verify";
    case "IMPORTING":
      return "progress";
    case "SYNCING":
      return "done";
    default:
      return "error";
  }
}

const CODE_KEY: Record<string, string> = {
  IMPORT_UNSUPPORTED_SOURCE: "errorUnsupported",
  IMPORT_FEED_NOT_FOUND: "errorFeedNotFound",
  IMPORT_SOURCE_UNREACHABLE: "errorUnreachable",
  IMPORT_SOURCE_TAKEN: "errorTaken",
  IMPORT_VERIFICATION_CODE_MISSING: "errorCodeMissing",
  IMPORT_ROBOTS_DISALLOWED: "errorRobots",
};

export function importErrorKey(err: unknown): string {
  if (err instanceof ApiError) {
    const code = err.detail.code;
    if (code && CODE_KEY[code]) return CODE_KEY[code];
    if (err.status === 429) return "errorRateLimited";
  }
  return "errorGeneric";
}

const SYNC_KEY: Record<string, string> = {
  IMPORT_SOURCE_UNREACHABLE: "syncUnreachable",
  IMPORT_FEED_NOT_FOUND: "syncFeedNotFound",
  IMPORT_ROBOTS_DISALLOWED: "errorRobots",
};

export function syncErrorKey(lastError: string | null): string {
  return (lastError && SYNC_KEY[lastError]) || "errorSync";
}

export function progressPercent(progress: ImportProgress | null): number {
  if (!progress || progress.total <= 0) return 0;
  return Math.min(100, Math.round((100 * progress.done) / progress.total));
}

const HOTLINK_BLOCKED_HOSTS = ["pstatic.net", "naver.net"];

export function previewThumb(platform: ImportPlatform, imageUrl: string | null): string | null {
  if (!imageUrl || platform === "NAVER") return null;
  try {
    const host = new URL(imageUrl).hostname;
    return HOTLINK_BLOCKED_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`)) ? null : imageUrl;
  } catch {
    return null;
  }
}

export const NAVER_FEW_POSTS = 10;

export type RssGuideKey = "NAVER" | "TISTORY" | "OPEN";

export const RSS_GUIDE_KEYS: readonly RssGuideKey[] = ["NAVER", "TISTORY", "OPEN"];

export function rssGuideKey(platform: ImportPlatform): RssGuideKey {
  return platform === "NAVER" || platform === "TISTORY" ? platform : "OPEN";
}

export function platformOfUrl(raw: string): ImportPlatform | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const host = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`).hostname.toLowerCase();
    if (host === "blog.naver.com" || host === "m.blog.naver.com") return "NAVER";
    if (host.endsWith(".tistory.com")) return "TISTORY";
    if (host === "velog.io") return "VELOG";
    if (host === "brunch.co.kr") return "BRUNCH";
    return null;
  } catch {
    return null;
  }
}

export function previewRssNotes(platform: ImportPlatform, itemCount: number, fullContent: boolean): string[] {
  const notes: string[] = [];
  if (!fullContent && platform === "TISTORY") notes.push("rss.tistoryFull");
  if (itemCount === 0) notes.push("rss.required", `rss.${rssGuideKey(platform)}`);
  else if (platform === "NAVER" && itemCount < NAVER_FEW_POSTS) notes.push("rss.NAVER");
  return notes;
}

export function withQuery(href: string, key: string, value: string | null): string {
  const url = new URL(href);
  url.searchParams.delete("url");
  url.searchParams.delete("source");
  if (value != null) url.searchParams.set(key, value);
  return url.toString();
}

export function syncedAt(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(dateLocale(locale), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
