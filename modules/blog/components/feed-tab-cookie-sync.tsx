"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { FEED_TAB_COOKIE, getFeedPrefs, writeFeedTabCookie } from "@/modules/blog/api/feed-prefs";

/**
 * Keeps the SSR default-tab cookie in step with the account pref across devices. The cookie is what
 * the blog-home server render reads; a device that set the pref elsewhere has a stale/absent cookie,
 * so on home load (signed in) we fetch the pref and rewrite the cookie if it differs. Renders nothing
 * and never redirects — the refreshed cookie just makes the *next* home load open on the right tab.
 */
export function FeedTabCookieSync() {
  const { ready, authenticated } = useAuth();

  useEffect(() => {
    if (!ready || !authenticated) return;
    let alive = true;
    getFeedPrefs()
      .then((p) => {
        if (!alive) return;
        const current = document.cookie.match(
          new RegExp(`(?:^|; )${FEED_TAB_COOKIE}=([^;]*)`),
        )?.[1];
        if (current !== p.defaultTab) writeFeedTabCookie(p.defaultTab);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ready, authenticated]);

  return null;
}
