"use client";

import { ArrowLeft, Check, Download, Send, Settings2, Trash2 } from "lucide-react";
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
  lastSavedAt,
  busy,
  onSave,
  onBack,
  onOpenPublish,
  onRestoreRevision,
  onExport,
  onDelete,
}: {
  backHref: string;
  postId: number;
  status: PostStatus;
  saving: boolean;
  saved: boolean;
  /** 이 세션의 마지막 성공 저장 시각 — "✓ 저장됨" 2초가 지나간 뒤에도 시각으로 안심. */
  lastSavedAt: Date | null;
  busy: boolean;
  onSave: () => void;
  /** Plain-click leaves via here (saves a dirty draft first). Modified clicks keep the raw link. */
  onBack: () => void;
  onOpenPublish: () => void;
  onRestoreRevision: (versionNumber: number) => void;
  /** 현재 글을 frontmatter 포함 .md 파일로 다운로드 — 데이터 소유권(언제든 들고 나갈 수 있음). */
  onExport: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("postEditor");
  const isDraft = status === "DRAFT";
  // 로케일 무관 HH:MM — 분 단위면 충분하고, 상대 시각("2분 전")은 1분마다 틱이 필요해 과함.
  const savedTime =
    lastSavedAt?.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }) ?? null;
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
        {isDraft ? (
          // Drafts autosave (1.8s idle) — no manual 저장 button (velog/Notion model). A quiet status
          // reassures: 저장 중… → 저장됨, and 자동 저장 at rest so it's clear saving is automatic.
          <span
            aria-live="polite"
            className="inline-flex items-center gap-1.5 px-2 text-[13px] font-medium text-slate-500 dark:text-slate-400"
          >
            {saving ? (
              t("saving")
            ) : saved ? (
              <>
                <Check className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                {t("saved")}
              </>
            ) : savedTime ? (
              // 체크 2초가 지나간 쉼 상태 — "마지막 저장이 언제였나"를 시각으로.
              <span className="text-slate-500 dark:text-slate-500">{t("savedAt", { time: savedTime })}</span>
            ) : (
              t("autoSave")
            )}
          </span>
        ) : (
          // Published / unpublished / scheduled don't autosave (the live post must not change
          // mid-edit) — keep the explicit 저장 button.
          <>
            <PostStatusBadge status={status} />
            {/* 공개 글은 명시 저장 — 버튼 옆 시각이 "마지막으로 반영된 때"를 말해 준다. */}
            {!saving && !saved && savedTime && (
              <span className="hidden text-[12px] text-slate-500 dark:text-slate-500 sm:inline">
                {t("savedAt", { time: savedTime })}
              </span>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {saved && <Check className="h-4 w-4 text-accent-600 dark:text-accent-400" />}
              {saving ? t("saving") : saved ? t("saved") : t("save")}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onOpenPublish}
          disabled={busy}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-accent-700 px-4 py-1.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-colors hover:bg-accent-800 disabled:opacity-50"
        >
          {isDraft ? <Send className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
          {/* Already-public posts aren't being "published" — this opens metadata + 내리기/예약, so it
              reads as 글 설정, not 발행 설정 (which only fits a draft about to go live). */}
          {isDraft ? t("publish") : t("postSettings")}
        </button>
        <RevisionsButton postId={postId} busy={busy} onRestore={onRestoreRevision} />
        <button
          type="button"
          onClick={onExport}
          className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          title={t("exportMd")}
          aria-label={t("exportMd")}
        >
          <Download className="h-4 w-4" />
        </button>
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

