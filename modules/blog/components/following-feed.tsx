"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listFollowingFeed } from "@/modules/blog/api/follows";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedGrid } from "@/modules/blog/components/feed-card";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";

/**
 * The "피드" tab — posts from authors the signed-in user follows. Authenticated, so it fetches
 * client-side with the access token. Signed-out viewers get a login prompt.
 */
export function FollowingFeed({ locale }: { locale: string }) {
  const t = useTranslations("publicFeed");
  const { authenticated, ready, signInWithGoogle } = useAuth();
  const [items, setItems] = useState<PublicFeedItem[] | null>(null);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let alive = true;
    listFollowingFeed(0, 24)
      .then((view) => {
        if (alive) setItems(view.items);
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, [ready, authenticated]);

  if (ready && !authenticated) {
    return (
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <p className="max-w-sm text-[15px] leading-relaxed text-slate-500">
          {t("followingSignedOut")}
        </p>
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
        >
          {t("signIn")}
        </button>
      </div>
    );
  }

  if (!ready || items === null) {
    return (
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <FeedEmpty title={t("emptyFollowingTitle")} body={t("followingEmpty")} />;
  }

  return (
    <div className="mt-8">
      <FeedGrid>
        {items.map((item) => (
          <FeedCard
            key={`${item.author.username}/${item.slug}`}
            item={item}
            locale={locale}
            labels={{ views: (count) => t("views", { count }) }}
          />
        ))}
      </FeedGrid>
    </div>
  );
}
