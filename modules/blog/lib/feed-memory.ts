// Imported by the edge middleware, so this module must stay free of imports.

export const BLOG_FEED_COOKIE = "kurl_blog_default_tab";
export const NOTES_FEED_COOKIE = "kurl_notes_feed";

export const BLOG_SWITCHER = ["following", "recent", "trending"] as const;
export const NOTES_SWITCHER = ["following", "everyone", "trending"] as const;

export type BlogSwitcherTab = (typeof BLOG_SWITCHER)[number];
export type NotesSwitcherFeed = (typeof NOTES_SWITCHER)[number];

export type FeedMemory = { cookie: string; keys: readonly string[]; param: string; fallback: string };

export const BLOG_MEMORY: FeedMemory = {
  cookie: BLOG_FEED_COOKIE,
  keys: BLOG_SWITCHER,
  param: "sort",
  fallback: "recent",
};
export const NOTES_MEMORY: FeedMemory = {
  cookie: NOTES_FEED_COOKIE,
  keys: NOTES_SWITCHER,
  param: "feed",
  fallback: "everyone",
};

export function rememberedBlogTab(value: string | null | undefined): BlogSwitcherTab | null {
  return (BLOG_SWITCHER as readonly string[]).includes(value ?? "") ? (value as BlogSwitcherTab) : null;
}

export function rememberedNotesFeed(value: string | null | undefined): NotesSwitcherFeed | null {
  return (NOTES_SWITCHER as readonly string[]).includes(value ?? "") ? (value as NotesSwitcherFeed) : null;
}

export function readFeedMemory(memory: FeedMemory): string | null {
  if (typeof document === "undefined") return null;
  const value = document.cookie.match(new RegExp(`(?:^|; )${memory.cookie}=([^;]*)`))?.[1] ?? null;
  return value && memory.keys.includes(value) ? value : null;
}

export function writeFeedMemory(memory: FeedMemory, key: string): void {
  if (typeof document === "undefined" || !memory.keys.includes(key)) return;
  document.cookie = `${memory.cookie}=${key}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function forgetFeedMemory(memory: FeedMemory): void {
  if (typeof document === "undefined") return;
  document.cookie = `${memory.cookie}=; Path=/; Max-Age=0; SameSite=Lax`;
}
