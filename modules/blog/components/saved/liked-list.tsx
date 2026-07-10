"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { ErrorState } from "@/components/common/error-state";
import { blogCta } from "@/modules/blog/components/blog-cta";
import { listLikedFeed } from "@/modules/blog/api/saved";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";

/** The owner's liked posts (private). Same feed-card list as everywhere else, owner-gated. */
export function LikedList({ username, locale }: { username: string; locale: string }) {
  const t = useTranslations("savedLibrary");
  const { ready, me } = useAuth();
  const isOwner = ready && me?.username === username;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PublicFeedItem[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await listLikedFeed());
    } catch {
      // 목록 로드 실패는 빈 상태로 위장하지 않고 재시도를 노출한다.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOwner) return;
    void load();
  }, [isOwner, load]);

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
  if (error) {
    return <ErrorState onRetry={() => void load()} />;
  }
  if (items.length === 0) {
    return (
      <FeedEmpty
        mark
        title={t("emptyLiked")}
        body={t("emptyLikedBody")}
        action={
          <a href={blogHref("/")} className={blogCta({ variant: "secondary" })}>
            {t("browseFeed")}
          </a>
        }
      />
    );
  }

  return (
    <FeedList>
      {items.map((item, i) => (
        <FeedCard key={item.slug} item={item} locale={locale} flushTop={i === 0} />
      ))}
    </FeedList>
  );
}
