"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, Check, ImagePlus, Link2, Loader2, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PostStatus } from "@/modules/blog/api/posts";
import type { StatusAction } from "@/modules/blog/components/editor/use-post-editor";
import { BrandTick } from "@/modules/blog/components/rail-heading";
import { SeriesSelect } from "@/modules/blog/components/editor/series-select";
import { TagInput } from "@/modules/blog/components/editor/tag-input";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";

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
  excerptSuggestion,
  slug,
  onSlugChange,
  tags,
  onTagsChange,
  seriesId,
  onSeriesChange,
  bodyLinks,
  previewAction,
  error,
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
  /** Body's opening line — prefilled into an empty 요약 on open so the author edits, not starts blank. */
  excerptSuggestion?: string;
  slug: string;
  onSlugChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  seriesId: number | null;
  onSeriesChange: (v: number | null) => void;
  /** External http(s) links found in the body — offered for auto-shortening through kurl on publish. */
  bodyLinks: string[];
  /** "미리보기 링크 복사" affordance, rendered in the footer for a not-yet-public post (null otherwise). */
  previewAction?: React.ReactNode;
  /** The editor's current error (failed save / publish), surfaced in the footer so a failed action
   *  keeps the dialog open with the reason rather than reading as a silent success. */
  error: string | null;
  saving: boolean;
  busy: boolean;
  onSave: () => Promise<void> | void;
  /** Resolves true once the status change succeeds — the dialog closes only then. */
  onChangeStatus: (a: StatusAction, opts?: { shortenLinks?: string[] }) => Promise<boolean>;
  /** Resolves true once the post is parked for a future publish — the dialog closes only then. */
  onSchedule: (iso: string, opts?: { shortenLinks?: string[] }) => Promise<boolean>;
}) {
  const t = useTranslations("postEditor");
  const { me } = useAuth();
  // 실제 발행 주소(blog.kurl.me/@user/…)를 보여준다 — 이전 표기 "kurl.me/{slug}" 는 단축링크
  // 도메인이라 발행되는 URL 과 달랐다. dev(path-based)에선 /blog-preview/@user/… 로 그대로 표시.
  const addressPrefix = blogHref(`/@${me?.username ?? ""}/`).replace(/^https?:\/\//, "");
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  // Which in-post links to auto-shorten through kurl on publish — all on by default; the author can
  // opt any out (kept as the original URL). Seeded when the dialog opens (body isn't edited while it's
  // open, so the detected set is stable for the session).
  const [shortenSet, setShortenSet] = useState<Set<string>>(new Set());

  // A public post must carry at least one topic (tag) AND a title — the reader's whole discovery
  // A public post needs at least one topic (tag) — the reader's whole discovery surface is
  // tag-driven — so tags gate the button (disabled) and the tag field nudges. A missing title does
  // NOT disable Publish: clicking it surfaces the inline "add a title" hint and fires no /publish
  // (changeStatus guards + returns false, so the dialog stays open) — a teachable click beats a
  // silently dead button.
  const canPublish = tags.length > 0;
  const needTags = tags.length === 0 && (status === "DRAFT" || status === "UNPUBLISHED");
  // Draft → "발행 설정" (about to go live); already-public → "글 설정" (managing the live post).
  const dialogTitle = status === "DRAFT" ? t("publishSettings") : t("postSettings");

  // Escape + Tab containment + focus restore to the editor's publish button — the panel declares
  // aria-modal, so keyboard focus must not escape into the editor beneath the backdrop.
  useFocusTrap(panelRef, { active: open, onEscape: onClose });

  useEffect(() => {
    if (open) setShortenSet(new Set(bodyLinks));
  }, [open, bodyLinks]);

  const enabledLinks = bodyLinks.filter((l) => shortenSet.has(l));
  const toggleLink = (url: string) =>
    setShortenSet((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });

  // Prefill an empty 요약 with the body's opening line when the dialog opens, so the author edits a
  // draft excerpt instead of facing a blank box. Once per open (the ref resets on close); never
  // overwrites text the author already has.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!open) {
      prefilled.current = false;
      return;
    }
    if (!prefilled.current && !excerpt.trim() && excerptSuggestion?.trim()) {
      prefilled.current = true;
      onExcerptChange(excerptSuggestion);
    }
  }, [open, excerpt, excerptSuggestion, onExcerptChange]);

  if (!open) return null;

  async function pickCover(file: File) {
    setUploading(true);
    setCoverError(null);
    try {
      onCoverChange(await onUploadCover(file));
    } catch (e) {
      // Don't fail silently (the dropzone just snapping back read as "nothing happened") — surface it.
      setCoverError(e instanceof Error ? e.message : t("imageError"));
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
        ref={panelRef}
        role="dialog"
        aria-modal
        aria-label={dialogTitle}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-slate-900 sm:rounded-2xl sm:max-w-3xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{dialogTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* velog-style two columns: LEFT = how the post will look (cover + summary), RIGHT = the
              publish settings (series · topics · address). Stacks to one column on mobile. */}
          <div className="grid gap-x-7 gap-y-5 sm:grid-cols-2">
            {/* LEFT — 보이는 모습 */}
            <div className="space-y-5">
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
            {coverError && (
              <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400" role="alert">
                {coverError}
              </p>
            )}
          </Field>

          {/* 요약 */}
          <Field label={t("excerpt")} hint={t("excerptHint")}>
            <textarea
              value={excerpt}
              onChange={(e) => onExcerptChange(e.target.value)}
              maxLength={300}
              rows={4}
              placeholder={t("excerptPlaceholder")}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-accent-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-accent-500"
            />
            <CharCount value={excerpt} max={300} />
          </Field>
            </div>

            {/* RIGHT — 발행 설정 */}
            <div className="space-y-5">
          {/* 시리즈 */}
          <Field label={t("series")}>
            <SeriesSelect
              value={seriesId}
              onChange={onSeriesChange}
              noneLabel={t("seriesNone")}
              emptyHint={t("seriesEmptyHint")}
            />
          </Field>

          {/* 태그 — 발행 필수 (주제 1개 이상). Persistent guidance, not a transient error — so NOT
              role="alert" (the disabled Publish button + the * marker already signal "required", and a
              standing hint shouldn't assertively re-announce; this also keeps it out of the dialog's
              single error-alert slot used by the cover-upload failure). */}
          <Field label={t("tags")} hint={needTags ? undefined : t("tagsHint")} required>
            <TagInput tags={tags} onChange={onTagsChange} placeholder={t("tagsPlaceholder")} />
            {needTags && (
              <p className="mt-1.5 text-[12px] font-medium text-amber-600 dark:text-amber-400">
                {t("tagsRequired")}
              </p>
            )}
          </Field>

          {/* slug — 초안 동안만 편집 */}
          <Field label={t("slugLabel")}>
            {status === "DRAFT" ? (
              <div className="flex items-center gap-1.5">
                <span className="min-w-0 truncate font-mono text-[13px] text-slate-500 dark:text-slate-400">{addressPrefix}</span>
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
              <p className="truncate font-mono text-[13px] text-slate-500 dark:text-slate-400">
                {addressPrefix}
                {slug}
              </p>
            )}
          </Field>

          {/* 본문 링크 — 발행 시 kurl 단축링크로 변환해 클릭 추적. 링크별로 끌 수 있음. */}
          {bodyLinks.length > 0 && (
            <Field label={t("bodyLinks")} hint={t("bodyLinksHint")}>
              <ul className="space-y-1 rounded-lg border border-slate-200 p-1.5 dark:border-slate-700">
                {bodyLinks.map((url) => {
                  const on = shortenSet.has(url);
                  let host = url;
                  try {
                    host = new URL(url).host.replace(/^www\./, "");
                  } catch {
                    /* keep raw */
                  }
                  return (
                    <li key={url}>
                      <button
                        type="button"
                        onClick={() => toggleLink(url)}
                        aria-pressed={on}
                        className="focus-ring flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <span
                          className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
                            on
                              ? "border-accent-600 bg-accent-700 text-white dark:border-accent-500 dark:bg-accent-500"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {on && <Check className="h-3 w-3" />}
                        </span>
                        <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700 dark:text-slate-200">
                          {host}
                          <span className="text-slate-400 dark:text-slate-500">
                            {url.slice(url.indexOf(host) + host.length)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Field>
          )}

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
          </div>
        </div>

        {/* Footer — status-aware actions */}
        <footer className="border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
          {/* Action error (failed publish/schedule/save) — keeps the dialog open with the reason so a
              failed action never reads as a silent success. */}
          {error && (
            <p className="mb-2.5 text-[13px] text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
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
            {previewAction}
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
              canPublish={canPublish}
              scheduleMode={showSchedule}
              scheduleReady={Boolean(scheduleAt)}
              t={t}
              // Close ONLY when the lifecycle action actually succeeds — a failed publish/schedule
              // (no title, server 409, …) keeps the dialog open with the error in the footer, instead
              // of closing and reading as a phantom "published".
              onPublish={async () => {
                await onSave();
                const ok =
                  showSchedule && scheduleAt
                    ? await onSchedule(scheduleAt, { shortenLinks: enabledLinks })
                    : await onChangeStatus("publish", { shortenLinks: enabledLinks });
                if (ok) onClose();
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
                await onChangeStatus("republish", { shortenLinks: enabledLinks });
              }}
              onCancelSchedule={async () => {
                await onSave();
                await onChangeStatus("backToDraft");
              }}
            />
          </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** Right-aligned character counter for a length-capped field; warns (amber) within 10% of the cap. */
function CharCount({ value, max }: { value: string; max: number }) {
  const n = value.length;
  const near = n >= max * 0.9;
  return (
    <p
      className={`mt-1 text-right text-[11px] tabular-nums ${
        near ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"
      }`}
    >
      {n}/{max}
    </p>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
        <BrandTick />
        {label}
        {required && (
          <span className="text-accent-600 dark:text-accent-400" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

function PrimaryAction({
  status,
  busy,
  canPublish,
  scheduleMode,
  scheduleReady,
  t,
  onPublish,
  onSaveChanges,
  onUnpublish,
  onRepublish,
  onCancelSchedule,
}: {
  status: PostStatus;
  busy: boolean;
  canPublish: boolean;
  /** The schedule panel is open — the primary action parks the post instead of publishing now. */
  scheduleMode: boolean;
  /** A publish time has been picked; gates the schedule action so an empty time can't fall through. */
  scheduleReady: boolean;
  t: ReturnType<typeof useTranslations>;
  onPublish: () => void;
  onSaveChanges: () => void;
  onUnpublish: () => void;
  onRepublish: () => void;
  onCancelSchedule: () => void;
}) {
  const solid =
    "focus-ring inline-flex items-center gap-1.5 rounded-lg bg-accent-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-800 disabled:opacity-50";
  if (status === "DRAFT") {
    // Schedule mode swaps the primary action wholesale: label, icon, and gating. With the panel
    // open but no time picked, the old single "발행" button silently fell through to an immediate
    // publish — the opposite of what the author was setting up.
    if (scheduleMode)
      return (
        <button
          type="button"
          onClick={onPublish}
          disabled={busy || !canPublish || !scheduleReady}
          title={!canPublish ? t("tagsRequired") : !scheduleReady ? t("scheduleInvalid") : undefined}
          className={solid}
        >
          <CalendarClock className="h-4 w-4" />
          {t("scheduleConfirm")}
        </button>
      );
    return (
      <button
        type="button"
        onClick={onPublish}
        disabled={busy || !canPublish}
        title={canPublish ? undefined : t("tagsRequired")}
        className={solid}
      >
        <Check className="h-4 w-4" />
        {t("publish")}
      </button>
    );
  }
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
      <button
        type="button"
        onClick={onRepublish}
        disabled={busy || !canPublish}
        title={canPublish ? undefined : t("tagsRequired")}
        className={solid}
      >
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
