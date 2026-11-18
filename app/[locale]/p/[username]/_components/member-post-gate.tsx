"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuth } from "@/lib/auth";
import { DATE_LOCALE } from "@/lib/date";
import { ErrorState } from "@/components/common/error-state";
import { readPostDetail, type PublicPostDetail } from "@/modules/blog/api/public-posts";
import { AuthorGate } from "@/modules/blog/components/author-gate";
import { readingMinutes } from "@/modules/blog/lib/reading-minutes";
import { POST_ARTICLE, POST_PAGE_GRID, PostAuthorRail, PostHeader } from "./post-chrome";
import { UnlockedArticle } from "./unlocked-article";

type Read = { key: string; detail: PublicPostDetail | null; failed: boolean };

function decoded(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** A room's post is 404 to the anonymous server render. A signed-in reader asks again with their own
 *  token, and the post opens in their browser when the server lets them in; the response stays a 404.
 *  Only a room's post opens here: any other address the server refused (a spent preview link, say) stays refused. */
export function MemberPostGate({ children, colophon }: { children: ReactNode; colophon: ReactNode }) {
  const params = useParams<{ username: string; slug: string }>();
  const { ready, authenticated } = useAuth();
  const [read, setRead] = useState<Read | null>(null);
  const [attempt, setAttempt] = useState(0);
  const username = decoded(params.username);
  const slug = decoded(params.slug);
  const key = `${username}/${slug}`;
  const signedIn = ready && authenticated;

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    readPostDetail(username, slug, {}).then((result) => {
      if (!live) return;
      const opened = result.ok && result.data.post.locked == null && result.data.post.room != null;
      const detail = opened ? result.data : null;
      setRead({ key, detail, failed: !result.ok && result.status === "error" });
    });
    return () => {
      live = false;
    };
  }, [signedIn, username, slug, key, attempt]);

  const current = signedIn && read?.key === key ? read : null;

  if (current?.failed) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 sm:py-12">
        <ErrorState
          onRetry={() => {
            setRead(null);
            setAttempt((n) => n + 1);
          }}
        />
      </main>
    );
  }
  if (current?.detail) return <MemberPost detail={current.detail} colophon={colophon} />;
  const asking = !ready || (authenticated && !current);
  return (
    <>
      <div data-auth-slot={ready ? undefined : "anon"} className={ready && asking ? "hidden" : "contents"}>
        {children}
      </div>
      {asking && (
        <div data-auth-slot={ready ? undefined : "authed"} className="contents">
          <main aria-busy className="min-h-[60vh]" />
        </div>
      )}
    </>
  );
}

function MemberPost({ detail, colophon }: { detail: PublicPostDetail; colophon: ReactNode }) {
  const locale = useLocale();
  const { author, post, blocks } = detail;
  const [postUrl, setPostUrl] = useState("");

  useEffect(() => {
    setPostUrl(`${window.location.origin}${window.location.pathname}`);
    document.title = post.title;
  }, [post.title]);

  const dateLabel = new Date(post.publishedAt).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
  const room = post.room ?? null;

  return (
    <main className={POST_PAGE_GRID} data-testid="member-post">
      <PostAuthorRail author={author} locale={locale} postId={post.id} follow />
      <article className={POST_ARTICLE} lang={post.languageTag} data-bhv-post={post.id}>
        <PostHeader
          eyebrow={detail.series ? detail.series.title : (post.tags[0] ?? null)}
          title={post.title}
          author={author}
          locale={locale}
          byline={{
            postId: post.id,
            authorUsername: author.username,
            publishedAt: post.publishedAt,
            dateLabel,
            minutes: readingMinutes(blocks),
            access: post,
          }}
          actions={{
            postId: post.id,
            postTitle: post.title,
            postSlug: post.slug,
            postUrl,
            likeCount: post.likeCount,
            room,
          }}
        />
        <AuthorGate username={author.username} subject="post">
          <UnlockedArticle detail={detail} locale={locale} postUrl={postUrl} />
        </AuthorGate>
        {colophon}
      </article>
    </main>
  );
}
