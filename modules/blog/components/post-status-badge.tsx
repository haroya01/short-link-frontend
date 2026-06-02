"use client";

import { useTranslations } from "next-intl";
import type { PostStatus } from "@/modules/blog/api/posts";

// One canonical tone per status. Was reimplemented with drifting shades (accent-50 vs 100, amber-50 vs
// 900, …) in the editor header / write list / workspace row — collapsed here so a post's status reads
// the same colour everywhere.
const TONE: Record<PostStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  PUBLISHED: "bg-accent-100 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300",
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  UNPUBLISHED: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

/** The single post-status pill. Label comes from the `postEditor.status{STATUS}` messages. */
export function PostStatusBadge({ status }: { status: PostStatus }) {
  const t = useTranslations("postEditor");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${TONE[status]}`}
    >
      {t(`status${status}`)}
    </span>
  );
}
