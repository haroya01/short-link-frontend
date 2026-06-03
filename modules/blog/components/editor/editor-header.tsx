"use client";

import { ArrowLeft, Check, Send, Settings2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PostStatus } from "@/modules/blog/api/posts";
import { PostStatusBadge } from "@/modules/blog/components/post-status-badge";
import { RevisionsButton } from "@/modules/blog/components/editor/revisions-button";

/**
 * Editor top bar — pure presentation. 저장 quick-saves the draft; the publish lifecycle (cover · 요약 ·
 * 시리즈 · 태그 · slug + 발행/예약/취소) lives behind the 발행 / 발행 설정 button → PublishDialog, so the
 * writing surface stays Zen. New header actions live here only.
 */
export function EditorHeader({
  backHref,
  postId,
  status,
  saving,
  saved,
  busy,
  onSave,
  onBack,
  onOpenPublish,
  onRestoreRevision,
  onDelete,
}: {
  backHref: string;
  postId: number;
  status: PostStatus;
  saving: boolean;
  saved: boolean;
  busy: boolean;
  onSave: () => void;
  /** Plain-click leaves via here (saves a dirty draft first). Modified clicks keep the raw link. */
  onBack: () => void;
  onOpenPublish: () => void;
  onRestoreRevision: (versionNumber: number) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("postEditor");
  const isDraft = status === "DRAFT";
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
      <a
        href={backHref}
        onClick={(e) => {
          // Plain left-click → save-then-navigate via onBack (don't lose a dirty draft). Let
          // modified clicks (new tab / middle-click) keep the native link behaviour.
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          onBack();
        }}
        className="focus-ring -ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">{t("backToList")}</span>
      </a>
      <div className="flex items-center gap-2">
        <PostStatusBadge status={status} />
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {saved && <Check className="h-4 w-4 text-accent-600 dark:text-accent-400" />}
          {saving ? t("saving") : saved ? t("saved") : t("save")}
        </button>
        <button
          type="button"
          onClick={onOpenPublish}
          disabled={busy}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-1.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-colors hover:bg-accent-700 disabled:opacity-50"
        >
          {isDraft ? <Send className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
          {isDraft ? t("publish") : t("publishSettings")}
        </button>
        <RevisionsButton postId={postId} busy={busy} onRestore={onRestoreRevision} />
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
          title={t("delete")}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

