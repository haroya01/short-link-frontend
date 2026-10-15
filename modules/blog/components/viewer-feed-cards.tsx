"use client";

import { listPublicFeed, type FeedSort, type PublicFeedItem } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
import { useViewerList } from "@/modules/blog/lib/use-viewer-list";

/** A few feed cards the server picked anonymously, then the signed-in reader's own pick. */
export function ViewerFeedCards({
  locale,
  initial,
  sort,
  size,
}: {
  locale: string;
  initial: PublicFeedItem[];
  sort: FeedSort;
  size: number;
}) {
  const items = useViewerList(
    initial,
    () => listPublicFeed(sort, 0, size).then((r) => (r.ok ? r.data.items.slice(0, size) : null)),
    `${sort}:${size}`,
  );
  return (
    <FeedList>
      {items.map((item) => (
        <FeedCard key={`${item.author.username}/${item.slug}`} item={item} locale={locale} />
      ))}
    </FeedList>
  );
}
