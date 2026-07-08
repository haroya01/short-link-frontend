"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import { addBookmark, listBookmarks, removeBookmark } from "@/modules/blog/api/bookmarks";
import { createSharedSetStore, useSetStore } from "@/modules/blog/lib/shared-set-store";

/**
 * A single shared bookmark store for the whole feed. Without it, dropping a {@link BookmarkButton} on
 * every card would fire one `GET /bookmark` per card on load (N+1). Instead the first mounted card
 * triggers one `listBookmarks()`; every card reads its saved state from the resulting `username/slug`
 * set and toggling updates the set optimistically (so all cards for the same post stay in sync).
 *
 * Module-level (not React context) so it spans every surface that renders feed cards — feed home, tag,
 * author, following — without threading a provider through each one.
 */
const key = (username: string, slug: string) => `${username}/${slug}`;

const store = createSharedSetStore<string>(async () =>
  (await listBookmarks()).map((b) => key(b.username, b.slug)),
);

export function useBookmarks() {
  const { authenticated, ready, signInWithGoogle } = useAuth();
  const set = useSetStore(store, { ready, authenticated });
  const { toast } = useToast();
  const t = useTranslations("publicFeed");

  const isSaved = useCallback((username: string, slug: string) => set.has(key(username, slug)), [set]);

  const toggle = useCallback(
    async (postId: number, username: string, slug: string) => {
      if (!authenticated) {
        signInWithGoogle();
        return;
      }
      await store.optimisticToggle(
        key(username, slug),
        (had) => (had ? removeBookmark(postId) : addBookmark(postId)),
        () => toast(t("bookmarkFailed"), "error"),
      );
    },
    [authenticated, signInWithGoogle, toast, t],
  );

  return { isSaved, toggle };
}
