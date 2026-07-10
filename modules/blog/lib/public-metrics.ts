/**
 * Public-facing engagement counts are hidden while they're still low, so a new blog doesn't read as
 * empty — "0 views / 0 likes" on every card makes the whole feed look dead. The author always sees
 * the exact numbers in the workspace (post list / stats); this only governs the public surfaces.
 *
 * - Views appear once a post has real traction (>= MIN_PUBLIC_VIEWS); below that the card shows just
 *   the date. Popular posts still surface their count as social proof.
 * - Likes appear from the first one — a single like is meaningful; "0" is not.
 */
export const MIN_PUBLIC_VIEWS = 10;

export function showViews(viewCount: number): boolean {
  return viewCount >= MIN_PUBLIC_VIEWS;
}

export function showLikes(likeCount: number): boolean {
  return likeCount > 0;
}

/**
 * Whether a post carries enough to earn a full card. A published post with a blank title AND no
 * excerpt is effectively empty — rendering it as full chrome (image slot, meta row, save toggle)
 * gives a hollow row a reader can't parse. Feeds skip these so a stray empty post never breaks the
 * scan. `title` is typed non-null but can be an empty string at runtime, so trim both.
 */
export function isRenderablePost(post: { title?: string | null; excerpt?: string | null }): boolean {
  return Boolean(post.title?.trim() || post.excerpt?.trim());
}
