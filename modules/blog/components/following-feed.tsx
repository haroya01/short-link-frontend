"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listFollowingFeed } from "@/modules/blog/api/follows";
import type { PublicAuthor, PublicFeedItem, SuggestedAuthor } from "@/modules/blog/api/public-posts";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref, FeedListSkeleton } from "@/modules/blog/components/feed-card";
import { DiscoveryCard, DiscoveryGrid, DiscoveryCell } from "@/modules/blog/components/discovery-card";
import { FollowFilterChips, type FeedFacet } from "@/modules/blog/components/follow-filter-chips";
import { useTagPrefs } from "@/modules/blog/lib/use-tag-prefs";
import { RailHeading } from "@/modules/blog/components/rail-heading";
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

function AuthorAvatar({ author }: { author: PublicAuthor }) {
  return <Avatar src={author.avatarUrl} name={author.username} size="md" />;
}

/** One author row in a rail — avatar + name, optional subtitle. Used by the suggested-authors list. */
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
        className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 focus-ring dark:hover:bg-slate-800/50"
      >
        <AuthorAvatar author={author} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-semibold text-slate-800 group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-slate-100">
            {author.username}
          </span>
          {subtitle && <span className="truncate text-[12px] text-slate-500 dark:text-slate-400">{subtitle}</span>}
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
  const { prefs } = useTagPrefs();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<PublicFeedItem[] | null>(null);

  // Active filter facet lives in the URL (?author= / ?topic=), so it survives reload and is shareable.
  // The feed merges 작가·시리즈·주제, so it narrows by one author OR one followed tag (in-place over
  // loaded items). 'topic' (not 'tag') to avoid the page's server-side ?tag= flat-grid route.
  const authorParam = searchParams.get("author");
  const topicParam = searchParams.get("topic");
  const facet: FeedFacet | null = authorParam
    ? { kind: "author", value: authorParam }
    : topicParam
      ? { kind: "tag", value: topicParam }
      : null;
  const setFacet = (next: FeedFacet | null) => {
    const params = new URLSearchParams(searchParams);
    params.delete("author");
    params.delete("topic");
    if (next?.kind === "author") params.set("author", next.value);
    else if (next?.kind === "tag") params.set("topic", next.value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

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
        <FeedEmpty
          mark
          title={t("followingSignedOutTitle")}
          body={t("followingSignedOut")}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button type="button" onClick={() => signInWithGoogle()} className={blogCta()}>
                {t("signIn")}
              </button>
              {/* Soft-nav back to the public feed — keeps a curious visitor reading instead of bouncing. */}
              <Link href="?sort=recent" className={blogCta({ variant: "secondary" })}>
                {t("followingBrowseLatest")}
              </Link>
            </div>
          }
        >
          {suggestedAuthors.length > 0 && (
            <section className="mt-10 w-full max-w-md border-t border-slate-100 pt-8 dark:border-slate-800">
              <RailHeading className="mb-3 justify-center">{t("railSuggestedAuthors")}</RailHeading>
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
        </FeedEmpty>
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
    return (
      <div className="mt-4">
        <FeedEmpty
          mark
          title={t("emptyFollowingTitle")}
          body={t("followingEmpty")}
          action={
            <Link href="?sort=recent" className={blogCta({ variant: "secondary" })}>
              {t("followingBrowseLatest")}
            </Link>
          }
        >
          {suggestedAuthors.length > 0 && (
            <section className="mt-10 w-full max-w-md border-t border-slate-100 pt-8 dark:border-slate-800">
              <RailHeading className="mb-3 justify-center">{t("railSuggestedAuthors")}</RailHeading>
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
        </FeedEmpty>
      </div>
    );
  }

  // "숨긴 주제"는 강한 부정 신호("이 주제는 안 볼래") — 팔로우로 떴어도 숨긴 태그를 가진 글은 제외(hidden
  // 우선). 공개 피드(feed-infinite)와 동일한 클라이언트 측 규칙으로 통일.
  const hiddenSet = new Set(prefs.hidden);
  const visible =
    hiddenSet.size === 0 ? items : items.filter((it) => !it.tags?.some((x) => hiddenSet.has(x)));

  // 사람(피드에 등장하는 작가) + 주제(내가 팔로우한 태그 중 이 피드에 실제로 글이 있는 것)를 필터 축으로.
  const followed = feedAuthors(visible);
  const followedNames = new Set(followed.map((a) => a.username));
  const hasTag = (it: PublicFeedItem, tag: string) =>
    it.tags?.some((x) => x.toLowerCase() === tag.toLowerCase()) ?? false;
  const presentTags = prefs.followed.filter((tag) => visible.some((it) => hasTag(it, tag)));

  // 선택한 facet 이 실제로 존재할 때만 필터 적용(없으면 전체) — 새로고침 직후 stale facet 방지.
  const activeFacet =
    facet?.kind === "author" && followedNames.has(facet.value)
      ? facet
      : facet?.kind === "tag" && presentTags.includes(facet.value)
        ? facet
        : null;
  const shown = !activeFacet
    ? visible
    : activeFacet.kind === "author"
      ? visible.filter((it) => it.author.username === activeFacet.value)
      : visible.filter((it) => hasTag(it, activeFacet.value));

  // 다른 발견 탭과 동일한 와이드 카드 그리드. 팔로우(사람+주제) 필터는 사이드 rail 대신 상단 칩으로.
  return (
    <div className="mx-auto mt-4 max-w-4xl">
      <FollowFilterChips authors={followed} tags={presentTags} active={activeFacet} onSelect={setFacet} />
      <DiscoveryGrid>
        {shown.map((item) => (
          <DiscoveryCell key={`${item.author.username}/${item.slug}`}>
            <DiscoveryCard item={item} locale={locale} />
          </DiscoveryCell>
        ))}
      </DiscoveryGrid>
    </div>
  );
}
