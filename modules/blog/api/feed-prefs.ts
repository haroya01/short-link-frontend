import { request } from "@/lib/api/client";
import { USE_MOCKS } from "@/modules/blog/api/_mocks";

/** A user's feed preferences — currently just the blog-home tab that opens by default. */
export interface FeedPrefs {
  defaultTab: FeedTab;
}

export type FeedTab = "recent" | "trending" | "following" | "series";
export const FEED_TABS: FeedTab[] = ["recent", "trending", "following", "series"];

/**
 * Cookie cache of {@link FeedPrefs.defaultTab}, so the blog-home server render can honor the chosen
 * landing tab without a per-request auth round-trip (the access token is client-only). The account is
 * the source of truth; this cookie is written client-side when the pref loads or changes.
 */
export const FEED_TAB_COOKIE = "kurl_blog_default_tab";

export function isFeedTab(v: string | undefined | null): v is FeedTab {
  return !!v && (FEED_TABS as string[]).includes(v);
}

const base = "/api/v1/users/me/feed-prefs";

/** Read the SSR cookie's tab (client only) — the mock's store, so it survives full navigations. */
function readFeedTabCookie(): FeedTab {
  if (typeof document === "undefined") return "recent";
  const v = document.cookie.match(new RegExp(`(?:^|; )${FEED_TAB_COOKIE}=([^;]*)`))?.[1];
  return isFeedTab(v) ? v : "recent";
}

export function getFeedPrefs(): Promise<FeedPrefs> {
  // Mock store = the cookie, so the demo persists across reloads (real mode persists in the account).
  if (USE_MOCKS) return Promise.resolve({ defaultTab: readFeedTabCookie() });
  return request<FeedPrefs>(base, { method: "GET" });
}

export function setDefaultTab(tab: FeedTab): Promise<FeedPrefs> {
  if (USE_MOCKS) {
    writeFeedTabCookie(tab);
    return Promise.resolve({ defaultTab: tab });
  }
  return request<FeedPrefs>(`${base}/default-tab/${encodeURIComponent(tab)}`, { method: "PUT" });
}

/** Write the SSR cookie (host-only, 1y) so the next blog-home load opens on this tab. */
export function writeFeedTabCookie(tab: FeedTab) {
  if (typeof document === "undefined") return;
  document.cookie = `${FEED_TAB_COOKIE}=${tab}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
