"use client";

import { Quote } from "lucide-react";
import { useTranslations } from "next-intl";
import { blogHref } from "@/lib/host";

export function QuoteInNoteButton({
  postId,
  title,
  slug,
  authorUsername,
}: {
  postId: number;
  title: string;
  slug: string;
  authorUsername: string;
}) {
  const t = useTranslations("notes");
  const query = new URLSearchParams({
    quote: String(postId),
    quoteTitle: title,
    quoteSlug: slug,
    quoteAuthor: authorUsername,
  });
  return (
    <a
      href={blogHref(`/notes?${query.toString()}`)}
      aria-label={t("quoteAction")}
      title={t("quoteAction")}
      className="touch-target focus-ring inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-[14px] font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
    >
      <Quote className="h-4 w-4" aria-hidden />
    </a>
  );
}
