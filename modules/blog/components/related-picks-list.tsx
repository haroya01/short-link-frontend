"use client";

import {
  listFeedByTag,
  listPublicPosts,
  type PublicAuthor,
  type PublicFeedItem,
} from "@/modules/blog/api/public-posts";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { relatedPicker } from "@/modules/blog/lib/related-picks";
import { useViewerList } from "@/modules/blog/lib/use-viewer-list";

export type RelatedRefresh = {
  tag: string;
  tagSize: number;
  author: PublicAuthor;
  pick: Parameters<typeof relatedPicker>[0];
};

/** "다음 읽을 글" — the server's anonymous picks, re-picked from the signed-in reader's own tag feed. */
export function RelatedPicksList({
  locale,
  heading,
  initial,
  refresh,
}: {
  locale: string;
  heading: string;
  initial: PublicFeedItem[];
  /** Null when the picks didn't come from a tag feed, so the reader's list can't differ. */
  refresh: RelatedRefresh | null;
}) {
  const picks = useViewerList(
    initial,
    async () => {
      if (!refresh) return null;
      const byTag = await listFeedByTag(refresh.tag, "recent", 0, refresh.tagSize);
      if (!byTag.ok) return null;
      const picker = relatedPicker(refresh.pick);
      for (const item of byTag.data.items) {
        if (picker.offer(item)) break;
      }
      if (picker.picks.length < refresh.pick.count) {
        const byAuthor = await listPublicPosts(refresh.author.username);
        if (byAuthor.ok) {
          for (const post of byAuthor.data.posts) {
            if (picker.offer({ ...post, author: refresh.author, viewCount: 0, followReason: null })) break;
          }
        }
      }
      return picker.picks;
    },
    refresh ? `${refresh.tag}:${refresh.pick.currentKey}` : "",
  );
  if (picks.length === 0) return null;

  return (
    <section aria-label={heading} className="mt-14 border-t border-slate-100 pt-8 dark:border-slate-800">
      <RailHeading className="mb-2">{heading}</RailHeading>
      <FeedList>
        {picks.map((item) => (
          <FeedCard key={`${item.author.username}/${item.slug}`} item={item} locale={locale} />
        ))}
      </FeedList>
    </section>
  );
}
