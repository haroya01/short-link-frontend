"use client";

import { useLocale, useTranslations } from "next-intl";
import type { QuotedPost } from "@/modules/notes/api/notes";
import { postHref } from "@/modules/blog/lib/author-href";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { contentLang } from "@/modules/blog/lib/content-lang";
import { AudienceMark } from "@/modules/blog/components/audience-mark";
import { CoverThumb } from "@/modules/blog/components/cover-thumb";

export interface PostCardDetail {
  excerpt: string | null;
  readMinutes: number;
  cover: string | null;
  languageTag: string;
}

export function QuotedPostCard({
  post,
  linked = true,
  detail,
}: {
  post: QuotedPost;
  linked?: boolean;
  detail?: PostCardDetail;
}) {
  const locale = useLocale();
  const t = useTranslations("notes");
  const tPost = useTranslations("publicPost");
  const content = detail ? (
    <span className="flex gap-3">
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
          <span className="shrink-0">{t("quotedPostKind")}</span>
          <AudienceMark item={post} />
        </span>
        <span
          lang={contentLang(post.title, detail.languageTag)}
          className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 dark:text-slate-100"
        >
          {post.title}
        </span>
        {detail.excerpt && (
          <span
            lang={contentLang(detail.excerpt, detail.languageTag)}
            className="mt-1 line-clamp-2 text-[14px] leading-snug text-slate-600 dark:text-slate-400"
          >
            {detail.excerpt}
          </span>
        )}
        <span className="mt-1.5 block text-[13px] text-slate-500 dark:text-slate-400">
          {tPost("ogReadingTime", { minutes: detail.readMinutes })}
        </span>
      </span>
      {detail.cover && (
        <span className="block h-[72px] w-[72px] shrink-0 self-start overflow-hidden rounded-inner bg-slate-100 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-800">
          <CoverThumb src={detail.cover} sizes="72px" className="h-full w-full object-cover" />
        </span>
      )}
    </span>
  ) : (
    <>
      <span className="flex min-w-0 items-center gap-1.5 text-[14px] leading-5">
        <span className="truncate font-semibold text-slate-900 dark:text-slate-100">{post.authorUsername}</span>
        <span className="shrink-0 text-slate-500 dark:text-slate-400">· {t("quotedPostKind")}</span>
        <AudienceMark item={post} />
      </span>
      <span
        lang={contentLang(post.title)}
        className="mt-1 block text-[15px] font-medium leading-snug text-slate-800 dark:text-slate-200"
      >
        {post.title}
      </span>
    </>
  );
  const frame = "mt-2.5 block rounded-surface border border-slate-200 px-4 py-3 dark:border-slate-800";
  if (!linked) {
    return (
      <div className={frame} data-quoted-post-id={post.id}>
        {content}
      </div>
    );
  }
  return (
    <BlogLink
      href={postHref(post.authorUsername, post.slug, locale)}
      data-quoted-post-id={post.id}
      className={`focus-ring ${frame} transition-colors hover:bg-slate-50 dark:hover:bg-slate-900`}
    >
      {content}
    </BlogLink>
  );
}
