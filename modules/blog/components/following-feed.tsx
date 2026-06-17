"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listFollowingFeed } from "@/modules/blog/api/follows";
import type { PublicAuthor, PublicFeedItem, SuggestedAuthor } from "@/modules/blog/api/public-posts";
import { Avatar } from "@/modules/blog/components/avatar";
import {
  DiscoveryCard,
  DiscoveryGrid,
  DiscoveryCell,
  DiscoveryGridSkeleton,
} from "@/modules/blog/components/discovery-card";
import { authorHref, FeedCard, FeedList, FeedListSkeleton } from "@/modules/blog/components/feed-card";
import { FollowFilterChips, type FeedFacet } from "@/modules/blog/components/follow-filter-chips";
import { useTagPrefs } from "@/modules/blog/lib/use-tag-prefs";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { blogCta } from "@/modules/blog/components/blog-cta";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { SuggestedCurators } from "@/modules/blog/components/suggested-curators";

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
  // Pagination — without it the feed silently ended at the first 24 posts: the API has had
  // page/size + hasNext all along, the component just never asked for page 1.
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
        if (!alive) return;
        setItems(view.items);
        setHasNext(view.hasNext);
        setPage(0);
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, [ready, authenticated]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasNext) return;
    setLoadingMore(true);
    setLoadError(false);
    const next = page + 1;
    try {
      const view = await listFollowingFeed(next, 24);
      // De-dupe defensively (same rule as feed-infinite): a new post at the head between fetches
      // can shift an already-seen post across the page boundary.
      setItems((prev) => {
        const seen = new Set((prev ?? []).map((i) => `${i.author.username}/${i.slug}`));
        return [...(prev ?? []), ...view.items.filter((i) => !seen.has(`${i.author.username}/${i.slug}`))];
      });
      setPage(next);
      setHasNext(view.hasNext);
    } catch {
      // Keep hasNext so the button stays as a retry; the error gates the auto-loader below.
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasNext, page]);

  // Auto-load as the reader nears the end; the button below stays as the no-JS/retry fallback.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNext || loadError) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNext, loadError, loadMore]);

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
          {/* Fallback when the server didn't pass a list (e.g. authenticated cold-start) — self-fetch
              curators so this never dead-ends. */}
          {suggestedAuthors.length === 0 && (
            <section className="mt-10 w-full max-w-md border-t border-slate-100 pt-8 dark:border-slate-800">
              <SuggestedCurators locale={locale} />
            </section>
          )}
        </FeedEmpty>
      </div>
    );
  }

  if (!ready || items === null) {
    return (
      <div className="mx-auto mt-4 max-w-4xl xl:max-w-5xl">
        <div className="mx-auto max-w-2xl md:hidden">
          <FeedListSkeleton />
        </div>
        <div className="hidden md:block">
          <DiscoveryGridSkeleton />
        </div>
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
          {/* Fallback when the server didn't pass a list (e.g. authenticated cold-start) — self-fetch
              curators so this never dead-ends. */}
          {suggestedAuthors.length === 0 && (
            <section className="mt-10 w-full max-w-md border-t border-slate-100 pt-8 dark:border-slate-800">
              <SuggestedCurators locale={locale} />
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
    // animate-fade-in: 스켈레톤 → 실제 그리드가 스왑이 아니라 짧은 크로스페이드로 읽히게.
    <div className="mx-auto mt-4 max-w-4xl animate-fade-in xl:max-w-5xl">
      <FollowFilterChips authors={followed} tags={presentTags} active={activeFacet} onSelect={setFacet} />
      {/* <md = single-column reading rows, md+ = discovery masonry — same split (and reasoning) as
          the grid branch of feed-infinite: 2-col tiles truncate titles and the CSS-columns masonry
          rebalances under the thumb. */}
      <div className="mx-auto max-w-2xl md:hidden">
        <FeedList>
          {shown.map((item) => (
            <FeedCard key={`${item.author.username}/${item.slug}`} item={item} locale={locale} />
          ))}
        </FeedList>
      </div>
      <div className="hidden md:block">
        <DiscoveryGrid>
          {shown.map((item, i) => (
            <DiscoveryCell key={`${item.author.username}/${item.slug}`} entranceDelay={Math.min((i % 24) * 25, 250)}>
              <DiscoveryCard item={item} locale={locale} />
            </DiscoveryCell>
          ))}
        </DiscoveryGrid>
      </div>

      {hasNext && (
        <div ref={sentinelRef} role="status" aria-live="polite" className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-ring disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loadingMore")}
              </>
            ) : loadError ? (
              t("retry")
            ) : (
              t("loadMore")
            )}
          </button>
          {loadError && !loadingMore && (
            <p className="text-[12px] text-slate-500 dark:text-slate-400">{t("loadMoreError")}</p>
          )}
        </div>
      )}
    </div>
  );
}
