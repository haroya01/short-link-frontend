"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, Check, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PostStatus } from "@/modules/blog/api/posts";
import type { StatusAction } from "@/modules/blog/components/editor/use-post-editor";
import { BrandTick } from "@/modules/blog/components/rail-heading";
import { SeriesSelect } from "@/modules/blog/components/editor/series-select";
import { TagInput } from "@/modules/blog/components/editor/tag-input";

/**
 * Publish settings panel (velog/Medium style) — keeps the writing surface Zen while gathering the
 * publish decisions in one place: 대표 이미지(cover) · 요약 · 시리즈 · 태그 · slug, then the status action.
 * Settings are saved first so a publish/schedule snapshot matches what's set here. Dark-aware.
 */
export function PublishDialog({
  open,
  onClose,
  status,
  scheduledAt,
  cover,
  onCoverChange,
  onUploadCover,
  excerpt,
  onExcerptChange,
  slug,
  onSlugChange,
  tags,
  onTagsChange,
  seriesId,
  onSeriesChange,
  saving,
  busy,
  onSave,
  onChangeStatus,
  onSchedule,
}: {
  open: boolean;
  onClose: () => void;
  status: PostStatus;
  scheduledAt: string | null;
  cover: string | null;
  onCoverChange: (url: string | null) => void;
  onUploadCover: (file: File) => Promise<string>;
  excerpt: string;
  onExcerptChange: (v: string) => void;
  slug: string;
  onSlugChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  seriesId: number | null;
  onSeriesChange: (v: number | null) => void;
  saving: boolean;
  busy: boolean;
  onSave: () => Promise<void> | void;
  onChangeStatus: (a: StatusAction) => Promise<void> | void;
  onSchedule: (iso: string) => Promise<void> | void;
}) {
  const t = useTranslations("postEditor");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function pickCover(file: File) {
    setUploading(true);
    try {
      onCoverChange(await onUploadCover(file));
    } finally {
      setUploading(false);
    }
  }

  // local datetime min (now) for the schedule input.
  const now = new Date();
  const localMin = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal
        aria-label={t("publishSettings")}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-slate-900 sm:rounded-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{t("publishSettings")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* 대표 이미지 */}
          <Field label={t("coverImage")} hint={t("coverImageHint")}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void pickCover(f);
              }}
            />
            {cover ? (
              <div className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" className="aspect-[1200/630] w-full object-cover" />
                <div className="absolute right-2 top-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="rounded-lg bg-slate-900/70 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur transition-colors hover:bg-slate-900/85"
                  >
                    {t("coverReplace")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onCoverChange(null)}
                    aria-label={t("coverRemove")}
                    className="grid h-7 w-7 place-items-center rounded-lg bg-slate-900/70 text-white backdrop-blur transition-colors hover:bg-red-600/90"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="focus-ring flex aspect-[1200/630] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-slate-400 transition-colors hover:border-accent-400 hover:text-accent-600 disabled:opacity-60 dark:border-slate-700 dark:text-slate-500 dark:hover:border-accent-500 dark:hover:text-accent-400"
              >
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
                <span className="text-[13px] font-medium">{uploading ? t("coverUploading") : t("coverAdd")}</span>
              </button>
            )}
          </Field>

          {/* 요약 */}
          <Field label={t("excerpt")} hint={t("excerptHint")}>
            <textarea
              value={excerpt}
              onChange={(e) => onExcerptChange(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder={t("excerptPlaceholder")}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-accent-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-accent-500"
            />
          </Field>

          {/* 시리즈 */}
          <Field label={t("series")}>
            <SeriesSelect
              value={seriesId}
              onChange={onSeriesChange}
              noneLabel={t("seriesNone")}
              emptyHint={t("seriesEmptyHint")}
            />
          </Field>

          {/* 태그 */}
          <Field label={t("tags")} hint={t("tagsHint")}>
            <TagInput tags={tags} onChange={onTagsChange} placeholder={t("tagsPlaceholder")} />
          </Field>

          {/* slug — 초안 동안만 편집 */}
          <Field label={t("slugLabel")}>
            {status === "DRAFT" ? (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[13px] text-slate-400 dark:text-slate-500">kurl.me/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => onSlugChange(e.target.value)}
                  maxLength={200}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[13px] text-slate-700 outline-none transition-colors focus:border-accent-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-accent-500"
                />
              </div>
            ) : (
              <p className="font-mono text-[13px] text-slate-400 dark:text-slate-500">kurl.me/{slug}</p>
            )}
          </Field>

          {/* 예약 (초안일 때) */}
          {status === "DRAFT" && showSchedule && (
            <Field label={t("scheduleAt")}>
              <input
                type="datetime-local"
                min={localMin}
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-accent-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:[color-scheme:dark]"
              />
            </Field>
          )}
        </div>

        {/* Footer — status-aware actions */}
        <footer className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {status === "DRAFT" && (
              <button
                type="button"
                onClick={() => setShowSchedule((v) => !v)}
                className={`focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  showSchedule
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                <CalendarClock className="h-4 w-4" />
                {t("schedule")}
              </button>
            )}
            {status === "SCHEDULED" && scheduledAt && (
              <span className="text-[12px] text-slate-500 dark:text-slate-400">
                {t("scheduledFor", { when: new Date(scheduledAt).toLocaleString() })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await onSave();
              }}
              disabled={saving || busy}
              className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
            >
              {saving ? t("saving") : t("saveDraft")}
            </button>
            <PrimaryAction
              status={status}
              busy={busy}
              t={t}
              onPublish={async () => {
                await onSave();
                if (showSchedule && scheduleAt) await onSchedule(scheduleAt);
                else await onChangeStatus("publish");
                onClose();
              }}
              onSaveChanges={async () => {
                await onSave();
                onClose();
              }}
              // Persist pending edits BEFORE the status flip — otherwise editing then Republish /
              // Cancel-schedule / Unpublish silently drops the new content (changeStatus only POSTs the
              // lifecycle endpoint, it doesn't save blocks/meta). Matches Publish / Save changes.
              onUnpublish={async () => {
                await onSave();
                await onChangeStatus("unpublish");
              }}
              onRepublish={async () => {
                await onSave();
                await onChangeStatus("republish");
              }}
              onCancelSchedule={async () => {
                await onSave();
                await onChangeStatus("backToDraft");
              }}
            />
          </div>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
        <BrandTick />
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

function PrimaryAction({
  status,
  busy,
  t,
  onPublish,
  onSaveChanges,
  onUnpublish,
  onRepublish,
  onCancelSchedule,
}: {
  status: PostStatus;
  busy: boolean;
  t: ReturnType<typeof useTranslations>;
  onPublish: () => void;
  onSaveChanges: () => void;
  onUnpublish: () => void;
  onRepublish: () => void;
  onCancelSchedule: () => void;
}) {
  const solid =
    "focus-ring inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-700 disabled:opacity-50";
  if (status === "DRAFT")
    return (
      <button type="button" onClick={onPublish} disabled={busy} className={solid}>
        <Check className="h-4 w-4" />
        {t("publish")}
      </button>
    );
  if (status === "PUBLISHED")
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUnpublish}
          disabled={busy}
          className="focus-ring rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/15"
        >
          {t("unpublish")}
        </button>
        <button type="button" onClick={onSaveChanges} disabled={busy} className={solid}>
          {t("saveChanges")}
        </button>
      </div>
    );
  if (status === "UNPUBLISHED")
    return (
      <button type="button" onClick={onRepublish} disabled={busy} className={solid}>
        {t("republish")}
      </button>
    );
  // SCHEDULED
  return (
    <button
      type="button"
      onClick={onCancelSchedule}
      disabled={busy}
      className="focus-ring rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/15"
    >
      {t("cancelSchedule")}
    </button>
  );
}
