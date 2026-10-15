"use client";

import { useTranslations } from "next-intl";
import type { PostStatus } from "@/modules/blog/api/posts";

// One canonical tone per status. Was reimplemented with drifting shades (accent-50 vs 100, amber-50 vs
// 900, …) in the editor header / write list / workspace row — collapsed here so a post's status reads
// the same colour everywhere.
const TONE: Record<PostStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  PUBLISHED: "text-slate-500 dark:text-slate-400",
  SCHEDULED: "bg-accent-50 text-accent-800 dark:bg-accent-500/15 dark:text-accent-300",
  UNPUBLISHED: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};
const TAKEN_DOWN_TONE = "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300";

/** The single post-status pill. Label comes from the `postEditor.status{STATUS}` messages. */
export function PostStatusBadge({ status, takenDown = false }: { status: PostStatus; takenDown?: boolean }) {
  const t = useTranslations("postEditor");
  return (
    <span
      className={`inline-flex items-center rounded-full py-0.5 text-[12px] font-medium ${status === "PUBLISHED" && !takenDown ? "" : "px-2.5"} ${takenDown ? TAKEN_DOWN_TONE : TONE[status]}`}
    >
      {takenDown ? t("statusTakenDown") : t(`status${status}`)}
    </span>
  );
}
