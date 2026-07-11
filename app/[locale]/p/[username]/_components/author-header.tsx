import { Link2 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cardHref } from "@/lib/host";
import { SwitchLink } from "@/components/common/switch-link";
import type { PublicAuthor, PublicPostListItem } from "@/modules/blog/api/public-posts";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref } from "@/modules/blog/components/feed-card";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { FollowCounts } from "@/modules/blog/components/follow-counts";
import { TagChip } from "@/modules/blog/components/tag-chip";
import { isDisplayableTag } from "@/modules/blog/lib/tag-normalize";
import { AuthorTabs } from "./author-tabs";

type Tab = "posts" | "series" | "collections" | "about";

const BLOG_HOST = process.env.NEXT_PUBLIC_BLOG_HOST;

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
 * Shared header for the author's blog pages (velog @user style): avatar + handle + bio + 대표 주제, then
 * a tab bar — 글 / 시리즈 / 컬렉션 / 소개. The identity block carries who this person is (name · bio · the
 * topics they write under · follow) on EVERY breakpoint — the right rail only exists on desktop, so the
 * topics have to ride the header to reach mobile. Hrefs are relative to the author subdomain root.
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
    { key: "series", href: authorTabHref(author.username, locale, "series"), label: t("tabSeries") },
    {
      key: "collections",
      href: authorTabHref(author.username, locale, "collections"),
      label: t("tabCollections"),
    },
    { key: "about", href: authorTabHref(author.username, locale, "about"), label: t("tabAbout") },
  ];

  return (
    <header>
      {/* Identity block. Rides the calm root crossfade on a tab switch (NOT its own view-transition
          group) — under that crossfade the OLD page is held at full opacity, so the identical avatar /
          handle / bio stay visually static instead of dipping. (A named group did the opposite: it
          crossfaded old-out/new-in, and the new snapshot is pre-hydration, so the whole block blinked.) */}
      <div className="flex items-start gap-5">
        <Avatar src={author.avatarUrl} name={author.username} size="xl" eager />
        <div className="min-w-0 flex-1 pt-1">
          {/* 이름이 먼저 눈에 든다 — 크기가 아니라 무게로. semibold → bold 로 존재감만 키우고 크기 스텝은
              그대로(headline-sm → md). */}
          <h1 className="text-headline-sm font-bold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
            @{author.username}
          </h1>
          {author.bio && (
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{author.bio}</p>
          )}
          {/* 대표 주제 — 이 사람이 주로 무엇을 쓰는지 한 줄. 레일 없는 모바일/태블릿에서도 정체성이
              "글 목록"이 아니라 "이 사람"으로 읽히게 하는 핵심. 라벨 없이 태그 자체가 말하게(§10 절제).
              xl+ 에선 우측 레일의 태그 섹션(카운트+전량 브라우즈)이 이 역할을 더 충실히 담당하므로 헤더
              칩은 숨겨 중복을 피한다. */}
          {topics.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2 xl:hidden">
              {topics.map((tag) => (
                <li key={tag}>
                  <TagChip href={topicHref(tag)} label={tag} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <FollowButton username={author.username} initialFollowerCount={0} showCount={false} />
            {/* Tappable follower / following counts — each opens the list at the matching tab. */}
            <FollowCounts username={author.username} />
            {/* Cross-surface link to the same person's link-in-bio (separate product, shared
                identity). Shown only when they actually have one. */}
            {author.hasLinkInBio && (
              <SwitchLink href={cardHref(author.username, locale)} icon={Link2}>
                {tNav("profile")}
              </SwitchLink>
            )}
          </div>
        </div>
      </div>

      <AuthorTabs tabs={tabs} username={author.username} />
    </header>
  );
}
