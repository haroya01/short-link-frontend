"use client";

import { useCallback, useEffect, useState } from "react";
import { CornerDownRight, Heart, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { DATE_LOCALE } from "@/lib/date";
import { blogHref } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { postHref } from "@/modules/blog/components/feed-card";
import { CommentBody } from "@/modules/blog/components/comment-markdown";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { ErrorState } from "@/components/common/error-state";
import { blogCta } from "@/modules/blog/components/blog-cta";
import { listMyComments, type MyComment } from "@/modules/blog/api/comments";

/**
 * 내 댓글 모아보기 — every comment the viewer has written, newest first, each anchored to the post it
 * lives on. Same quiet list-row rhythm as the feed (max-w-2xl, bottom-border dividers, hover wash),
 * and the body uses the shared comment-markdown renderer so it reads exactly as it does under the post.
 */
export function MyCommentsList({ locale }: { locale: string }) {
  const t = useTranslations("savedLibrary");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MyComment[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await listMyComments());
    } catch {
      // 목록 로드 실패는 "댓글 없음" 빈 상태로 위장하지 않고 재시도를 노출한다 (liked-list와 동일).
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
        title={t("emptyComments")}
        body={t("emptyCommentsBody")}
        action={
          <a href={blogHref("/")} className={blogCta({ variant: "secondary" })}>
            {t("browseFeed")}
          </a>
        }
      />
    );
  }

  return (
    <ul className="flex max-w-2xl flex-col">
      {items.map((c) => {
        const url = postHref(c.postUsername, c.postSlug, locale);
        return (
          <li key={c.id} className="group border-b border-slate-100 last:border-b-0 dark:border-slate-800">
            <div className="-mx-3 rounded-xl px-3 py-5 transition-colors group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40">
              {/* The post this comment lives on — a quiet eyebrow that doubles as the link back. */}
              <BlogLink
                href={url}
                className="inline-flex max-w-full items-center gap-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400"
              >
                {c.parentId != null && <CornerDownRight className="h-3 w-3 shrink-0" aria-hidden />}
                <span className="line-clamp-1">{c.postTitle}</span>
              </BlogLink>

              <div className="mt-1.5 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
                <CommentBody text={c.body} locale={locale} />
              </div>

              <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                <time dateTime={c.createdAt}>{formatDate(c.createdAt, locale)}</time>
                {c.likeCount > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3 text-accent-600" />
                      {c.likeCount}
                    </span>
                  </>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
}
