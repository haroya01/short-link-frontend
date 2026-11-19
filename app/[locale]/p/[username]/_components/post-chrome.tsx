import type { ComponentProps } from "react";
import { linksHref } from "@/lib/host";
import type { PublicAuthor } from "@/modules/blog/api/public-posts";
import { AuthorOnly } from "@/modules/blog/components/author-gate";
import { AuthorName } from "@/modules/blog/components/author-name";
import { Avatar } from "@/modules/blog/components/avatar";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { authorHref } from "@/modules/blog/lib/author-href";
import { contentLang } from "@/modules/blog/lib/content-lang";
import { splitHyphenWords } from "@/modules/blog/lib/hyphen-words";
import { BylineMeta } from "./byline-meta";
import { PostActionRow } from "./post-action-row";

// Symmetric 3-column grid: equal side gutters keep the 42rem article in the exact page center,
// the same reading band as the feed/profile (§10.1 max-w-7xl 불변식). Rails live in the gutters and
// never shift it. xl:gap-6 (not gap-10) tightens the two gutters so the rail content sits closer to
// the reading column — the wide gutter left the author block floating alone far to the left; a
// snugger gap gives the three columns a shared rhythm without touching the 42rem band.
export const POST_PAGE_GRID =
  "mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 xl:grid-cols-[1fr_minmax(0,42rem)_1fr] xl:gap-6";

export const POST_ARTICLE =
  "post-enter mx-auto w-full max-w-2xl pb-14 pt-8 max-[1100px]:pb-[calc(var(--post-dock-h,0px)+3.5rem)] sm:pt-20 min-[1100px]:pb-20";

const BYLINE_NAME =
  "text-sm font-semibold text-slate-900 group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400";

type HeaderActions = Pick<
  ComponentProps<typeof PostActionRow>,
  "postId" | "postTitle" | "postSlug" | "postUrl" | "likeCount" | "room" | "audience"
>;

/** Left rail (xl+): a persistent author identity + follow that stays once the in-article header
 *  scrolls away. In the left gutter, justify-self-end so it hugs the reading column instead of
 *  floating alone at the far edge; w-64 fills the gutter so the void reads as an even ~24px inset
 *  on either side of the rail (matching the grid gap) rather than a lonely avatar in wide empty
 *  space. The centered 42rem article never moves. */
export function PostAuthorRail({
  author,
  locale,
  postId,
  follow,
}: {
  author: PublicAuthor;
  locale: string;
  postId: number;
  follow: boolean;
}) {
  return (
    <aside className="hidden py-20 xl:block xl:justify-self-end">
      <div className="sticky top-28 w-64">
        <a
          href={authorHref(author.username, locale)}
          className="group flex items-center gap-3 rounded focus-ring"
          data-bhv="profile"
          data-bhv-id={author.username}
        >
          <Avatar src={author.avatarUrl} name={author.displayName || author.username} handle={author.username} size="lg" />
          <AuthorName name={author.displayName} handle={author.username} className={BYLINE_NAME} />
        </a>
        {author.bio && (
          <p
            lang={contentLang(author.bio)}
            className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400"
          >
            {author.bio}
          </p>
        )}
        {follow && (
          <div className="mt-4">
            <FollowButton username={author.username} initialFollowerCount={0} sourcePostId={postId} />
          </div>
        )}
      </div>
    </aside>
  );
}

/** 마스트헤드 아래 조용한 헤어라인(§10.1 border-slate-100 계열)으로 제목·메타를 하나의 블록으로
 *  닫는다 — xl 에선 헤더가 얇은 메타 한 줄뿐이라 닫는 선이 없으면 본문과 경계가 흐릿했다. */
export function PostHeader({
  eyebrow,
  title,
  author,
  locale,
  byline,
  actions,
}: {
  eyebrow: string | null;
  title: string;
  author: PublicAuthor;
  locale: string;
  byline: ComponentProps<typeof BylineMeta>;
  actions: HeaderActions | null;
}) {
  return (
    <header className="mb-8 border-b border-slate-100 pb-6 dark:border-slate-800 sm:mb-12 sm:pb-8">
      {eyebrow && (
        <p className="mb-3 text-[12px] font-medium text-slate-500 dark:text-slate-400">{eyebrow}</p>
      )}
      {/* 모바일 30px → sm+ 37px: 힘은 크기가 아니라 weight(bold)+tight tracking 에서. 이전 32/40px 은
          좁은 뷰포트에서 두 줄로 크게 쏟아져 포트폴리오 목업처럼 읽혔다 — 스텝만 ~6% 줄여 절제하되,
          본문 h2(24px)보다는 항상 확실히 크게(30 > 24) 유지해 위계는 그대로. leading 은 큰 디스플레이의
          tight 감(1.15/1.1)을 이어간다. */}
      <h1 className="text-headline-post font-bold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-post-lg">
        {splitHyphenWords(title).map((part, i) =>
          part.keep ? (
            <span key={i} className="whitespace-nowrap">
              {part.text}
            </span>
          ) : (
            part.text
          ),
        )}
      </h1>
      <div className="mt-5 flex items-center justify-between gap-3 sm:mt-6">
        {/* <xl: full author identity + follow inline. xl: those move to the left rail, so the header
            keeps only date·reading time + share — no duplicated author/follow at the top. */}
        <a
          href={authorHref(author.username, locale)}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded focus-ring xl:hidden"
          data-bhv="profile"
          data-bhv-id={author.username}
        >
          <Avatar src={author.avatarUrl} name={author.displayName || author.username} handle={author.username} size="lg" />
          <span className="min-w-0">
            <AuthorName name={author.displayName} handle={author.username} className={BYLINE_NAME} />
            <span className="block text-[13px] text-slate-500 dark:text-slate-400">
              <BylineMeta {...byline} />
            </span>
          </span>
        </a>
        <p className="hidden text-[13px] text-slate-500 dark:text-slate-400 xl:block">
          <BylineMeta {...byline} />
        </p>
        {actions && (
          <AuthorOnly username={author.username}>
            <div data-post-actions className="ml-auto flex shrink-0 items-center gap-2">
              <span className="xl:hidden">
                <FollowButton
                  username={author.username}
                  initialFollowerCount={0}
                  showCount={false}
                  sourcePostId={actions.postId}
                />
              </span>
              <PostActionRow {...actions} authorUsername={author.username} locale={locale} menuOnlyBelowWide />
            </div>
          </AuthorOnly>
        )}
      </div>
    </header>
  );
}

/** 글 페이지엔 공용 푸터가 없다 — ©·약관·개인정보만 콜로폰 톤으로. */
export function PostColophon({
  locale,
  copyright,
  terms,
  privacy,
}: {
  locale: string;
  copyright: string;
  terms: string;
  privacy: string;
}) {
  return (
    <p className="mt-16 flex items-center justify-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
      <span>{copyright}</span>
      <span aria-hidden>·</span>
      <a href={linksHref(`/${locale}/terms`)} className="focus-ring rounded underline-offset-2 hover:underline">
        {terms}
      </a>
      <span aria-hidden>·</span>
      <a href={linksHref(`/${locale}/privacy`)} className="focus-ring rounded underline-offset-2 hover:underline">
        {privacy}
      </a>
    </p>
  );
}
