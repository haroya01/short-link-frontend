"use client";

import { useTranslations } from "next-intl";
import type { PostStatus } from "@/modules/blog/api/posts";

// One canonical tone per status. Was reimplemented with drifting shades (accent-50 vs 100, amber-50 vs
// 900, …) in the editor header / write list / workspace row — collapsed here so a post's status reads
// the same colour everywhere.
const TONE: Record<PostStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  PUBLISHED: "text-slate-500 dark:text-slate-400",
  SCHEDULED: "border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300",
  UNPUBLISHED: "bg-slate-600 text-white dark:bg-slate-300 dark:text-slate-900",
};

/** The single post-status pill. Label comes from the `postEditor.status{STATUS}` messages. */
export function PostStatusBadge({ status }: { status: PostStatus }) {
  const t = useTranslations("postEditor");
  return (
    <span
      className={`inline-flex items-center rounded-full py-0.5 text-[12px] font-medium ${status === "PUBLISHED" ? "" : "px-2.5"} ${TONE[status]}`}
    >
      {t(`status${status}`)}
    </span>
  );
}
