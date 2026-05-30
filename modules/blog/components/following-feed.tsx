"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listFollowingFeed } from "@/modules/blog/api/follows";
import type { PublicFeedItem, SuggestedAuthor } from "@/modules/blog/api/public-posts";
import { authorHref, FeedCard, FeedGrid } from "@/modules/blog/components/feed-card";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";

/**
 * The "피드" tab — posts from authors the signed-in user follows. Authenticated, so it fetches
 * client-side with the access token. Signed-out viewers don't hit a dead end: they get a designed
 * prompt that lets them sign in, keep browsing the latest feed, or follow a suggested author right
 * away (server-fetched, passed in so the panel is meaningful without a round-trip).
 */
export function FollowingFeed({
  locale,
  suggestedAuthors = [],
}: {
  locale: string;
  suggestedAuthors?: SuggestedAuthor[];
}) {
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
      <div className="mt-8">
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-50 text-accent-600">
            <Users className="h-7 w-7" />
          </span>
          <h2 className="mt-6 text-[19px] font-semibold tracking-tight text-slate-900">
            {t("followingSignedOutTitle")}
          </h2>
          <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-slate-500">
            {t("followingSignedOut")}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(5,150,105,0.45)] transition-colors hover:bg-accent-700"
            >
              {t("signIn")}
            </button>
            {/* Soft-nav back to the public feed — keeps a curious visitor reading instead of bouncing. */}
            <Link
              href="?sort=recent"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {t("followingBrowseLatest")}
            </Link>
          </div>
        </div>

        {suggestedAuthors.length > 0 && (
          <section className="mx-auto max-w-md border-t border-slate-100 pt-8">
            <h3 className="mb-3 text-center text-[13px] font-bold uppercase tracking-wide text-slate-500">
              {t("railSuggestedAuthors")}
            </h3>
            <ul className="flex flex-col gap-1">
              {suggestedAuthors.map(({ author, postCount }) => (
                <li key={author.username}>
                  <a
                    href={authorHref(author.username, locale)}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    {author.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={author.avatarUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-100 text-[13px] font-semibold text-accent-700">
                        {author.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[14px] font-semibold text-slate-800 group-hover:text-slate-900">
                        {author.username}
                      </span>
                      <span className="truncate text-[12px] text-slate-400">
                        {t("railPostCount", { count: postCount })}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
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
