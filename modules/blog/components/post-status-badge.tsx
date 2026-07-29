"use client";

import { useTranslations } from "next-intl";
import type { PostStatus } from "@/modules/blog/api/posts";

// One canonical tone per status. Was reimplemented with drifting shades (accent-50 vs 100, amber-50 vs
// 900, …) in the editor header / write list / workspace row — collapsed here so a post's status reads
// the same colour everywhere.
// 색은 그린 1실 + 무채색만 — 예약(파랑)·발행중단(앰버)이 워크스페이스 화면 유일의 타색으로 브랜드
// 규칙(단독 타색 금지)을 깼다(적대 검증 r6). 예약 행에는 이미 그린 "…발행 예정" 텍스트가 있어 색
// 없이도 구분된다: 초안=옅은 채움 · 예약=아웃라인 · 발행중단=진한 채움 · 발행됨만 그린.
const TONE: Record<PostStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  PUBLISHED: "bg-accent-100 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300",
  SCHEDULED: "border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300",
  UNPUBLISHED: "bg-slate-600 text-white dark:bg-slate-300 dark:text-slate-900",
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
