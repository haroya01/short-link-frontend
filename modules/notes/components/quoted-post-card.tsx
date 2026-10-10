"use client";

import { useLocale, useTranslations } from "next-intl";
import type { QuotedPost } from "@/modules/notes/api/notes";
import { postHref } from "@/modules/blog/lib/author-href";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { contentLang } from "@/modules/blog/lib/content-lang";

export function QuotedPostCard({ post, linked = true }: { post: QuotedPost; linked?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("notes");
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-1.5 text-[14px] leading-5">
        <span className="truncate font-semibold text-slate-900 dark:text-slate-100">{post.authorUsername}</span>
        <span className="shrink-0 text-slate-500 dark:text-slate-400">· {t("quotedPostKind")}</span>
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
