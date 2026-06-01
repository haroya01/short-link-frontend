"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PostStatus } from "@/modules/blog/api/posts";
import { RevisionsButton } from "@/modules/blog/components/editor/revisions-button";
import { SchedulePopover } from "@/modules/blog/components/editor/schedule-popover";
import type { StatusAction } from "@/modules/blog/components/editor/use-post-editor";

/**
 * Editor top bar — pure presentation. Save is the single solid primary; the status lifecycle is a
 * quieter outline button keyed off the post status. New header actions live here only.
 */
export function EditorHeader({
  backHref,
  postId,
  status,
  scheduledAt,
  saving,
  saved,
  busy,
  onSave,
  onChangeStatus,
  onSchedule,
  onRestoreRevision,
  onDelete,
}: {
  backHref: string;
  postId: number;
  status: PostStatus;
  scheduledAt: string | null;
  saving: boolean;
  saved: boolean;
  busy: boolean;
  onSave: () => void;
  onChangeStatus: (action: StatusAction) => void;
  onSchedule: (iso: string) => void;
  onRestoreRevision: (versionNumber: number) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("postEditor");
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
      <a
        href={backHref}
        className="focus-ring -ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">{t("backToList")}</span>
      </a>
      <div className="flex items-center gap-2">
        <StatusPill status={status} label={t(`status${status}`)} />
        {status === "SCHEDULED" && scheduledAt && (
          <span className="hidden text-[12px] text-slate-500 dark:text-slate-400 sm:inline">
            {t("scheduledFor", { when: new Date(scheduledAt).toLocaleString() })}
          </span>
        )}
        {status === "DRAFT" && (
          <>
            <SchedulePopover disabled={busy} onSchedule={onSchedule} />
            <OutlineButton tone="accent" disabled={busy} onClick={() => onChangeStatus("publish")}>
              {t("publish")}
            </OutlineButton>
          </>
        )}
        {status === "SCHEDULED" && (
          <OutlineButton
            tone="amber"
            disabled={busy}
            onClick={() => onChangeStatus("backToDraft")}
          >
            {t("cancelSchedule")}
          </OutlineButton>
        )}
        {status === "PUBLISHED" && (
          <OutlineButton tone="amber" disabled={busy} onClick={() => onChangeStatus("unpublish")}>
            {t("unpublish")}
          </OutlineButton>
        )}
        {status === "UNPUBLISHED" && (
          <OutlineButton tone="accent" disabled={busy} onClick={() => onChangeStatus("republish")}>
            {t("republish")}
          </OutlineButton>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-1.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-colors hover:bg-accent-700 disabled:opacity-50"
        >
          {saved && <Check className="h-4 w-4" />}
          {saving ? t("saving") : saved ? t("saved") : t("save")}
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

const STATUS_PILL: Record<PostStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  PUBLISHED: "bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300",
  UNPUBLISHED: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  SCHEDULED: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

function StatusPill({ status, label }: { status: PostStatus; label: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${STATUS_PILL[status]}`}>
      {label}
    </span>
  );
}

function OutlineButton({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone: "accent" | "amber";
}) {
  const cls =
    tone === "accent"
      ? "border-accent-300 text-accent-700 hover:bg-accent-50 dark:border-accent-500/40 dark:text-accent-300 dark:hover:bg-accent-500/15"
      : "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/15";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`focus-ring rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}
