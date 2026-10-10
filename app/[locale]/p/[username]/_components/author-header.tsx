import { ArrowUpRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cardHref } from "@/lib/host";
import type { PublicAuthor, PublicPostListItem } from "@/modules/blog/api/public-posts";
import { authorHref } from "@/modules/blog/lib/author-href";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { LockedMark } from "@/modules/blog/components/locked-mark";
import { AuthorMoreMenu } from "@/modules/notes/components/author-more-menu";
import { FollowCounts } from "@/modules/blog/components/follow-counts";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { isDisplayableTag } from "@/modules/blog/lib/tag-normalize";
import { DATE_LOCALE } from "@/lib/date";
import { AuthorTabs } from "./author-tabs";
import { AvatarZoom } from "./avatar-zoom";
import { HeaderBio } from "./header-bio";

type Tab = "posts" | "notes" | "reposts" | "series" | "collections" | "about";

const BLOG_HOST = process.env.NEXT_PUBLIC_BLOG_HOST;
const KURL_HOST = process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me";

// 대표 주제로 노출할 태그 수. 정체성 한 눈에 잡히는 정도만 — 나머지 전량은 데스크톱 레일 태그 섹션이 담당.
const MAX_TOPIC_TAGS = 4;

/**
 * Same-origin RELATIVE path to an author tab, so the bar soft-navigates (BlogLink → next/link) and
 * ProfileChrome's persistent header stays mounted (no avatar/handle/tab blink, no scroll reset on a
 * tab switch). authorHref() returns an ABSOLUTE blog.kurl.me URL in prod, which BlogLink downgrades
 * to a hard <a> reload. prod: the profile is served at blog.kurl.me/@{user} (middleware rewrites →
 * /{locale}/p/{user}), so the visible path is /@{user}[/sub]; dev/preview: the apex path route
 * /{locale}/p/{user}[/sub]. Full base paths (not a bare "/series") so both deployments resolve.
 */
function authorTabHref(username: string, locale: string, sub = ""): string {
  const base = BLOG_HOST ? `/@${username}` : `/${locale}/p/${username}`;
  return sub ? `${base}/${sub}` : base;
}

/** The month of the author's first published post — "2026년 5월" / "May 2026". */
function earliestMonth(posts: PublicPostListItem[], locale: string): string {
  const first = posts.reduce((min, p) => (p.publishedAt < min ? p.publishedAt : min), posts[0].publishedAt);
  return new Date(first).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    year: "numeric",
    month: "long",
    timeZone: "Asia/Seoul",
  });
}

/**
 * 작가가 주로 쓰는 주제 — 발행 글의 태그를 빈도순으로 모아 상위 N개만. 레일 태그 섹션과 같은 파생이지만
 * 여기선 "이 사람" 존재감을 위한 소수 대표 태그로 좁힌다(레일은 전량 브라우즈).
 */
function topTopicTags(posts: PublicPostListItem[]): string[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      if (!isDisplayableTag(tag)) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TOPIC_TAGS)
    .map(([tag]) => tag);
}

/**
 * Shared header for the author's blog pages: handle as the headline, bio, one line of what they've
 * written (count · since when · followers · their kurl card address), their main topics, then the
 * 글 / 시리즈 / 컬렉션 / 소개 bar. Topics ride the header below xl because the rail only exists there.
 */
export async function AuthorHeader({
  author,
  posts = [],
}: {
  author: PublicAuthor;
  /** The author's published posts — used only to derive their 대표 주제 (top tags). Optional so a caller
   *  without the list (or an empty author) simply renders the identity without a topics row. */
  posts?: PublicPostListItem[];
}) {
  const t = await getTranslations("publicPost");
  const tNav = await getTranslations("nav");
  const locale = await getLocale();
  const topics = topTopicTags(posts);
  // A topic chip filters THIS author's posts (?tag=) — same author-scoped filter the rail uses, never
  // the cross-author topic feed. Relative to the author home so the click soft-navigates.
  const topicHref = (tag: string) => `${authorHref(author.username, locale)}?tag=${encodeURIComponent(tag)}`;
  // The profile is the author's PUBLIC surface; the viewer's own private reading list (좋아요 /
  // 북마크) lives in the workspace (/blog/curation), reachable from the account menu — not as
  // owner-only tabs on a public page.
  const tabs: { key: Tab; href: string; label: string }[] = [
    { key: "posts", href: authorTabHref(author.username, locale), label: t("tabPosts") },
    { key: "notes", href: authorTabHref(author.username, locale, "notes"), label: t("tabNotes") },
    { key: "reposts", href: authorTabHref(author.username, locale, "reposts"), label: t("tabReposts") },
    { key: "series", href: authorTabHref(author.username, locale, "series"), label: t("tabSeries") },
    {
      key: "collections",
      href: authorTabHref(author.username, locale, "collections"),
      label: t("tabCollections"),
    },
    { key: "about", href: authorTabHref(author.username, locale, "about"), label: t("tabAbout") },
  ];

  const since = posts.length > 0 ? earliestMonth(posts, locale) : null;
  const cardHost = `${author.username}.${KURL_HOST}`;

  return (
    <header>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <AvatarZoom src={author.avatarUrl} name={author.username} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-[26px] font-bold leading-tight tracking-headline text-slate-900 dark:text-slate-100 sm:text-[32px]">
                {author.displayName || `@${author.username}`}
              </h1>
              <LockedMark username={author.username} />
            </div>
            {author.displayName && (
              <p className="truncate text-[14px] text-slate-500 dark:text-slate-400">@{author.username}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <FollowButton username={author.username} initialFollowerCount={0} showCount={false} showBell />
          <AuthorMoreMenu username={author.username} />
        </div>
      </div>

      {author.bio && <HeaderBio bio={author.bio} />}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-slate-500 dark:text-slate-400">
        {posts.length > 0 && (
          <span className="tabular-nums">
            {t("activityPosts", { count: posts.length })}
            {since && (
              <>
                <span aria-hidden className="mx-1.5 text-slate-300 dark:text-slate-600">
                  ·
                </span>
                {t("activitySince", { date: since })}
              </>
            )}
          </span>
        )}
        <FollowCounts username={author.username} />
        {author.hasLinkInBio && (
          <a
            href={cardHref(author.username, locale)}
            title={tNav("profile")}
            className="focus-ring inline-flex items-center gap-1 rounded-sm font-mono text-[13px] text-slate-600 underline-offset-4 transition-colors hover:text-accent-700 hover:underline dark:text-slate-300 dark:hover:text-accent-400"
          >
            {cardHost}
            <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {topics.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] xl:hidden">
          {topics.map((tag) => (
            <BlogLink
              key={tag}
              href={topicHref(tag)}
              className="focus-ring rounded-sm text-slate-600 transition-colors hover:text-accent-700 dark:text-slate-300 dark:hover:text-accent-400"
            >
              #{tag}
            </BlogLink>
          ))}
        </p>
      )}

      <AuthorTabs tabs={tabs} username={author.username} />
    </header>
  );
}
