"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listFollowingFeed } from "@/modules/blog/api/follows";
import type { PublicAuthor, PublicFeedItem, SuggestedAuthor } from "@/modules/blog/api/public-posts";
import { authorHref, FeedCard, FeedList, FeedListSkeleton } from "@/modules/blog/components/feed-card";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { ReadingShell } from "@/modules/blog/components/reading-shell";
import { blogCta } from "@/modules/blog/components/blog-cta";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";

/** Authors that appear in the feed, de-duplicated and in first-seen order — i.e. the followed authors
 *  you're actually reading right now. Capped so the rail stays a glance, not a directory. */
function feedAuthors(items: PublicFeedItem[], limit = 8): PublicAuthor[] {
  const seen = new Set<string>();
  const out: PublicAuthor[] = [];
  for (const it of items) {
    if (seen.has(it.author.username)) continue;
    seen.add(it.author.username);
    out.push(it.author);
    if (out.length >= limit) break;
  }
  return out;
}

/** One author row in a rail — avatar + name, optional subtitle. Shared by the followed/suggested lists. */
function AuthorRow({
  author,
  locale,
  subtitle,
}: {
  author: PublicAuthor;
  locale: string;
  subtitle?: string;
}) {
  return (
    <li>
      <a
        href={authorHref(author.username, locale)}
        className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 focus-ring"
      >
        {author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-100 text-[13px] font-semibold text-accent-700">
            {author.username.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-semibold text-slate-800 group-hover:text-slate-900">
            {author.username}
          </span>
          {subtitle && <span className="truncate text-[12px] text-slate-500">{subtitle}</span>}
        </span>
      </a>
    </li>
  );
}

/**
 * The "피드" tab — posts from authors the signed-in user follows. Authenticated, so it fetches
 * client-side with the access token. Signed-out viewers don't hit a dead end: they get a designed
 * prompt that lets them sign in, keep browsing the latest feed, or follow a suggested author right
 * away (server-fetched, passed in so the panel is meaningful without a round-trip).
 *
 * Signed-in, the right rail (which the recent feed has but this tab lacked) is filled with the context
 * that fits here: the authors you follow (derived from the feed, so no extra request) + suggested
 * authors to follow, so following few doesn't dead-end into a sparse feed beside an empty column.
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
            <button type="button" onClick={() => signInWithGoogle()} className={blogCta()}>
              {t("signIn")}
            </button>
            {/* Soft-nav back to the public feed — keeps a curious visitor reading instead of bouncing. */}
            <Link href="?sort=recent" className={blogCta({ variant: "secondary" })}>
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
                <AuthorRow
                  key={author.username}
                  author={author}
                  locale={locale}
                  subtitle={t("railPostCount", { count: postCount })}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  if (!ready || items === null) {
    return (
      <div className="mt-8">
        <FeedListSkeleton />
      </div>
    );
  }

  if (items.length === 0) {
    return <FeedEmpty title={t("emptyFollowingTitle")} body={t("followingEmpty")} />;
  }

  const followed = feedAuthors(items);
  // Don't suggest authors that already show up in "팔로우한 작가" — the backend may not pre-filter
  // (mocks don't), and the same face twice in one rail reads as a bug.
  const followedNames = new Set(followed.map((a) => a.username));
  const suggestions = suggestedAuthors.filter((s) => !followedNames.has(s.author.username));

  // Same rail slot as the recent feed, filled with the following-tab context.
  const rail =
    followed.length > 0 || suggestions.length > 0 ? (
      <div className="flex flex-col gap-6">
        {followed.length > 0 && (
          <section>
            <RailHeading className="mb-3">{t("railFollowingAuthors")}</RailHeading>
            <ul className="flex flex-col gap-1">
              {followed.map((author) => (
                <AuthorRow key={author.username} author={author} locale={locale} />
              ))}
            </ul>
          </section>
        )}

        {suggestions.length > 0 && (
          <section>
            <RailHeading className="mb-3">{t("railSuggestedAuthors")}</RailHeading>
            <ul className="flex flex-col gap-1">
              {suggestions.map(({ author, postCount }) => (
                <AuthorRow
                  key={author.username}
                  author={author}
                  locale={locale}
                  subtitle={t("railPostCount", { count: postCount })}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    ) : undefined;

  return (
    <ReadingShell className="mt-8" rail={rail}>
      <FeedList>
        {items.map((item) => (
          <FeedCard key={`${item.author.username}/${item.slug}`} item={item} locale={locale} />
        ))}
      </FeedList>
    </ReadingShell>
  );
}
