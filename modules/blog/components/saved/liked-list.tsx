"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
import { listLikedFeed } from "@/modules/blog/api/saved";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";

/** The owner's liked posts (private). Same feed-card list as everywhere else, owner-gated. */
export function LikedList({ username, locale }: { username: string; locale: string }) {
  const t = useTranslations("savedLibrary");
  const { ready, me } = useAuth();
  const isOwner = ready && me?.username === username;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PublicFeedItem[]>([]);

  useEffect(() => {
    if (!isOwner) return;
    let alive = true;
    listLikedFeed()
      .then((list) => alive && setItems(list))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [isOwner]);

  if (ready && !isOwner) {
    return <p className="py-16 text-center text-[14px] text-slate-500 dark:text-slate-400">{t("private")}</p>;
  }
  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="py-16 text-center text-[14px] text-slate-500 dark:text-slate-400">{t("emptyLiked")}</p>;
  }

  return (
    <FeedList>
      {items.map((item, i) => (
        <FeedCard key={item.slug} item={item} locale={locale} flushTop={i === 0} />
      ))}
    </FeedList>
  );
}
