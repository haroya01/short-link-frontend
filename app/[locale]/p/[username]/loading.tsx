import { FeedListSkeleton } from "@/modules/blog/components/feed-card";

/**
 * Content skeleton for the author's post tab. The header (identity + tabs) is held by the persistent
 * layout (ProfileChrome) and is NOT part of this fallback — so a tab switch streams the list skeleton
 * in below a rock-still header instead of flashing the whole surface to grey. Dark-aware via the list.
 */
export default function AuthorLoading() {
  return (
    <div className="mx-auto mt-8 max-w-2xl">
      <FeedListSkeleton />
    </div>
  );
}
