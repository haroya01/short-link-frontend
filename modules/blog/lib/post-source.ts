import type { PostSource } from "@/modules/blog/api/public-posts";

export function httpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function bareUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function canonicalFor(postUrl: string, source: PostSource | null | undefined): string {
  return httpUrl(source?.originalUrl) ?? postUrl;
}

export function sourcePlatformName(
  source: PostSource,
  t: { has: (key: string) => boolean; (key: string): string },
): string {
  const key = `sourcePlatform.${source.platform}`;
  if (t.has(key)) return t(key);
  const original = httpUrl(source.originalUrl);
  return original ? new URL(original).host : source.platform;
}
