"use client";

import { useTranslations } from "next-intl";
import type { PostStatus } from "@/modules/blog/api/posts";

// One canonical tone per status. Was reimplemented with drifting shades (accent-50 vs 100, amber-50 vs
// 900, …) in the editor header / write list / workspace row — collapsed here so a post's status reads
// the same colour everywhere.
const TONE: Record<PostStatus, string> = {
  DRAFT: "font-semibold text-slate-700 dark:text-slate-200",
  PUBLISHED: "font-medium text-slate-500 dark:text-slate-400",
  SCHEDULED: "font-semibold text-slate-900 dark:text-slate-100",
  UNPUBLISHED: "font-semibold text-amber-700 dark:text-amber-300",
};
const TAKEN_DOWN_TONE = "font-semibold text-red-700 dark:text-red-300";

/** The single post-status label. Label comes from the `postEditor.status{STATUS}` messages. */
export function PostStatusBadge({ status, takenDown = false }: { status: PostStatus; takenDown?: boolean }) {
  const t = useTranslations("postEditor");
  return (
    <span
      className={`inline-flex items-center text-[12px] ${takenDown ? TAKEN_DOWN_TONE : TONE[status]}`}
    >
      {takenDown ? t("statusTakenDown") : t(`status${status}`)}
    </span>
  );
}
