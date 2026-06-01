/**
 * Curation — pinned posts. `setPinnedPosts` persists to the backend (`PUT /api/v1/posts/pins`) and
 * the author's published pins surface first on their public profile; the current pin state rides on
 * each post's `pinOrder` (PostView), so the page derives it from `listMyPosts` rather than a
 * separate fetch. (Bookmarks moved to their own account-backed module: modules/blog/api/bookmarks.)
 */
import { request } from "@/lib/api/client";

/**
 * Replace the author's pinned set (ordered post ids → pin_order = list index). Only the caller's
 * own PUBLISHED posts are pinnable; the backend ignores anything else. The new state is reflected
 * in subsequent `listMyPosts()` via each post's `pinOrder`.
 */
export function setPinnedPosts(orderedIds: number[]): Promise<void> {
  return request<void>(`/api/v1/posts/pins`, { method: "PUT", body: { postIds: orderedIds } });
}
