"use client";

import { useLocale } from "next-intl";
import type { QuotedPost } from "@/modules/notes/api/notes";
import { postHref } from "@/modules/blog/lib/author-href";
import { BlogLink } from "@/modules/blog/components/blog-link";

export function QuotedPostCard({ post }: { post: QuotedPost }) {
  const locale = useLocale();
  return (
    <BlogLink
      href={postHref(post.authorUsername, post.slug, locale)}
      className="focus-ring mt-2.5 block rounded-2xl border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
    >
      <span className="block text-[13px] font-semibold text-slate-900 dark:text-slate-100">
        {post.authorUsername}
      </span>
      <span className="mt-0.5 block text-[15px] leading-snug text-slate-800 dark:text-slate-200">
        {post.title}
      </span>
    </BlogLink>
  );
}
