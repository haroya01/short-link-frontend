"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, Check, ChevronDown, ImagePlus, Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { PostStatus } from "@/modules/blog/api/posts";
import { POST_IMAGE_TYPES, postImageErrorMessageKey } from "@/modules/blog/api/post-images";
import type { StatusAction } from "@/modules/blog/components/editor/use-post-editor";
import { Avatar } from "@/modules/blog/components/avatar";
import { SeriesSelect } from "@/modules/blog/components/editor/series-select";
import { TakenDownNotice } from "@/modules/blog/components/editor/taken-down-notice";
import { TagInput } from "@/modules/blog/components/editor/tag-input";
import { isDisplayableTag } from "@/modules/blog/lib/tag-normalize";
import { isSavableSlug } from "@/modules/blog/lib/slug";
import { rowDate } from "@/modules/notes/lib/compact-time";
import { scheduledLabel } from "@/modules/blog/lib/scheduled-label";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { useConfirm } from "@/components/ui/use-confirm";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";

const TAKEN_DOWN_NOTICE_ID = "publish-taken-down";

/**
 * Publish panel — a confirmation, not a form. The centerpiece is a live card preview (cover · title ·
 * 요약 · tags) of how the post will appear in the feed and share cards, with the cover auto-filled from
 * the body's first image and the 요약 prefilled from the opening line — so for most posts the author
 * only adds a topic and hits 발행. Everything decided rarely (시리즈 · 주소)
 * folds into the collapsed 추가 설정 section; the publish address stays readable on its collapsed row.
 * Settings are saved first so a publish/schedule snapshot matches what's set here. Dark-aware.
 */
export function PublishDialog({
  open,
  onClose,
  status,
  takenDown = false,
  scheduledAt,
  title,
  cover,
  onCoverChange,
  onUploadCover,
  onCoverPrefill,
  coverSuggestion,
  excerpt,
  onExcerptChange,
  onExcerptPrefill,
  excerptSuggestion,
  slug,
  onSlugChange,
  tags,
  onTagsChange,
  tagSuggestions,
  seriesId,
  onSeriesChange,
  previewAction,
  error,
  slugError = null,
  saving,
  busy,
  onSave,
  onChangeStatus,
  onSchedule,
  onCancelSchedule,
}: {
  open: boolean;
  onClose: () => void;
  status: PostStatus;
  takenDown?: boolean;
  scheduledAt: string | null;
  /** Canvas title, mirrored read-only in the card preview (empty → the 제목 없음 placeholder). */
  title: string;
  cover: string | null;
  onCoverChange: (url: string | null) => void;
  onUploadCover: (file: File) => Promise<string>;
  /** Writes the auto-cover WITHOUT marking the post dirty — same contract as onExcerptPrefill (a
   *  machine prefill isn't a user edit). Falls back to onCoverChange when not wired. */
  onCoverPrefill?: (url: string | null) => void;
  /** First image in the body. On a DRAFT it's auto-applied as the cover when none is set (badged,
   *  removable); on an already-public post it stays a one-tap offer — a live share card must not
   *  change just because this dialog opened. */
  coverSuggestion?: string | null;
  excerpt: string;
  onExcerptChange: (v: string) => void;
  /** Writes the open-time excerpt prefill WITHOUT marking the post dirty (a machine prefill isn't a user
   *  edit — otherwise opening the dialog alone arms discard-confirm / draft autosave). Falls back to
   *  onExcerptChange when not wired. */
  onExcerptPrefill?: (v: string) => void;
  /** Body's opening line — prefilled into an empty 요약 on open so the author edits, not starts blank. */
  excerptSuggestion?: string;
  slug: string;
  onSlugChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  /** Followed + popular tags, offered as one-tap chips while the tag field has focus. */
  tagSuggestions?: string[];
  seriesId: number | null;
  onSeriesChange: (v: number | null) => void;
  /** "미리보기 링크 복사" affordance, rendered in the footer for a not-yet-public post (null otherwise). */
  previewAction?: React.ReactNode;
  /** The editor's current error (failed save / publish), surfaced in the footer so a failed action
   *  keeps the dialog open with the reason rather than reading as a silent success. */
  error: string | null;
  /** Why the server refused the typed slug — shown under the slug field; the footer only points there. */
  slugError?: string | null;
  saving: boolean;
  busy: boolean;
  /** Persists pending edits. Resolves false when the save failed (or was a no-op that left content
   *  unsaved) so a lifecycle action can hold instead of publishing a stale snapshot / dropping edits.
   *  A permissive void return is treated as "not a failure" for back-compat. */
  onSave: () => Promise<boolean | void> | boolean | void;
  /** Resolves true once the status change succeeds — the dialog closes only then. */
  onChangeStatus: (a: StatusAction) => Promise<boolean>;
  /** Resolves true once the post is parked for a future publish — the dialog closes only then. */
  onSchedule: (iso: string) => Promise<boolean>;
  onCancelSchedule: () => Promise<boolean>;
}) {
  const t = useTranslations("postEditor");
  const locale = useLocale();
  const { me } = useAuth();
  const [confirm, confirmDialog] = useConfirm();
  // On mobile the on-screen keyboard shrinks the visual viewport; lift the sheet by that inset so the
  // sticky footer (Publish) and lower fields stay reachable while a field is focused (0 on desktop).
  const keyboardInset = useKeyboardInset();
  // 실제 발행 주소(blog.kurl.me/@user/…)를 보여준다 — 이전 표기 "kurl.me/{slug}" 는 단축링크
  // 도메인이라 발행되는 URL 과 달랐다. dev(path-based)에선 /blog-preview/@user/… 로 그대로 표시.
  const addressPrefix = blogHref(`/@${me?.username ?? ""}/`).replace(/^https?:\/\//, "");
  const slugInvalid = status === "DRAFT" && !isSavableSlug(slug);
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tagsFieldRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  // 추가 설정(시리즈·주소)은 접어 둔다 — 매번 정하는 게 아닌 것들이라 필수(카드
  // 미리보기·태그·발행 시점)만 한 열로 보인다. 발행 주소는 접힌 줄에서도 읽힌다.
  const [showAdvanced, setShowAdvanced] = useState(false);
  // The current cover came from the auto-apply below (drives the "본문 첫 이미지" badge). Cleared the
  // moment the author uploads or picks one deliberately.
  const [autoCover, setAutoCover] = useState(false);
  // The author explicitly removed the cover — don't auto-apply one on a later open this session.
  const coverDismissed = useRef(false);
  // Teachable click: instead of a silently-disabled Publish, clicking with no topics scrolls the tag
  // field into view and flags it. Set on a failed publish attempt, cleared once a tag is added.
  const [tagNudge, setTagNudge] = useState(false);
  const slugErrorRef = useRef<HTMLParagraphElement>(null);

  // A public post needs at least one topic (tag) — the reader's whole discovery surface is
  // tag-driven — so tags gate the button (disabled) and the tag field nudges. A missing title does
  // NOT disable Publish: clicking it surfaces the inline "add a title" hint and fires no /publish
  // (changeStatus guards + returns false, so the dialog stays open) — a teachable click beats a
  // silently dead button.
  const canPublish = tags.length > 0;
  // The nudge shows only after a publish attempt with no tags, and clears the moment a tag lands.
  const showTagNudge = tagNudge && tags.length === 0;
  // Draft → "발행 설정" (about to go live); already-public → "글 설정" (managing the live post).
  const dialogTitle = status === "DRAFT" ? t("publishSettings") : t("postSettings");

  // Escape + Tab containment + focus restore to the editor's publish button — the panel declares
  // aria-modal, so keyboard focus must not escape into the editor beneath the backdrop.
  useFocusTrap(panelRef, { active: open, onEscape: onClose });

  useEffect(() => {
    if (open && slugError) setShowAdvanced(true);
  }, [open, slugError]);

  useEffect(() => {
    if (open && slugError && showAdvanced) slugErrorRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, slugError, showAdvanced]);

  const scheduledInput = scheduledAt ? toLocalInput(scheduledAt) : "";
  useEffect(() => {
    if (open && status === "SCHEDULED") setScheduleAt(scheduledInput);
  }, [open, status, scheduledInput]);

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
      // A programmatic prefill must not mark the post dirty — otherwise merely opening and closing the
      // dialog arms the discard-confirm (published) or the draft autosave of a machine excerpt.
      (onExcerptPrefill ?? onExcerptChange)(excerptSuggestion);
    }
  }, [open, excerpt, excerptSuggestion, onExcerptChange, onExcerptPrefill]);

  // Auto-cover: a DRAFT with no cover gets the body's first image applied on open — the author sees it
  // already ON (badged, replace/remove at hand) instead of discovering a bare share card after
  // publishing. A prefill, not an edit (no dirty); never for an already-public post, whose live share
  // card must not change because a dialog opened. Once removed, it stays removed for the session.
  useEffect(() => {
    if (!open || status !== "DRAFT" || cover || coverDismissed.current || !coverSuggestion) return;
    (onCoverPrefill ?? onCoverChange)(coverSuggestion);
    setAutoCover(true);
  }, [open, status, cover, coverSuggestion, onCoverChange, onCoverPrefill]);

  if (!open) return null;

  async function pickCover(file: File) {
    setUploading(true);
    setCoverError(null);
    try {
      onCoverChange(await onUploadCover(file));
      setAutoCover(false); // a deliberate pick, not the machine's
    } catch (e) {
      // Don't fail silently (the dropzone just snapping back read as "nothing happened") — surface a
      // localized reason (typed image errors carry a code + sizes; else the generic upload error).
      const { key, values } = postImageErrorMessageKey(e);
      setCoverError(t(key, values));
    } finally {
      setUploading(false);
    }
  }

  function removeCover() {
    // Any explicit remove means "no cover, and don't decide for me again this session" — whether the
    // removed image was the machine's or the author's own upload.
    coverDismissed.current = true;
    setAutoCover(false);
    onCoverChange(null);
  }


  // Card preview mirrors the real FeedCard: eyebrow = first DISPLAYABLE tag, date pinned to Seoul
  // (the hydration rule for date formatting) — the meta line is display-only realism.
  const eyebrowTag = tags.find(isDisplayableTag);
  const todayLabel = rowDate(new Date().toISOString(), locale);

  // local datetime min (now) for the schedule input.
  const now = new Date();
  const localMin = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center scrim p-0 sm:items-center sm:p-4"
      // Push the whole sheet up above the on-screen keyboard on mobile (0 on desktop).
      style={{ paddingBottom: keyboardInset || undefined }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal
        aria-label={dialogTitle}
        // `dialog-max-h` caps the panel at 92vh with a 92dvh refinement (globals.css). The `vh`
        // fallback is load-bearing: an engine that doesn't understand `dvh` (iOS Safari <15.4, older
        // in-app WebViews) drops the `dvh` line — without the `vh` cap first the panel had NO height
        // bound, grew to full content height, and pushed the sticky footer (the 발행 button) off-screen
        // (reported "특정 브라우저에서 발행 버튼 안 보임"). Declared in CSS, not two Tailwind arbitrary
        // classes, so the vh→dvh source order (and thus the cascade) is guaranteed.
        className="dialog-max-h flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-modal dark:bg-slate-850 sm:max-w-xl sm:rounded-2xl"
        // With the keyboard up, cap the sheet to the remaining visual viewport so its scroll area shrinks
        // (rather than the footer sliding under the keyboard). `100vh - keyboardInset` already subtracts
        // the keyboard height, so it works on every engine (including no-dvh ones) without needing dvh.
        style={keyboardInset ? { maxHeight: `calc(100vh - ${keyboardInset}px)` } : undefined}
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
          {/* ── 카드 미리보기: 실제 피드 카드(FeedCard §10.2)와 같은 행 문법 — 대표 태그 → 제목 →
              요약 → 작가·날짜, 이미지는 오른쪽 작은 4:3 썸네일(없으면 완성된 타이포 행). 요약은 행
              안에서 바로 고치고, 커버 조작은 카드 아래 한 줄로 뺀다(축소된 썸네일 위 오버레이는
              들어갈 자리가 없다). 라벨 달린 폼 필드와 힌트 문장들을 이 한 덩어리가 대체한다. */}
          <section aria-label={t("previewCardLabel")}>
            <p className="mb-2 text-[12px] font-medium text-slate-500 dark:text-slate-400">
              {t("previewCardLabel")}
            </p>
            <div className="rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-700">
              <input
                ref={fileRef}
                type="file"
                accept={POST_IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void pickCover(f);
                }}
              />
              <div className="flex gap-4 sm:gap-6">
                <div className="min-w-0 flex-1">
                  {eyebrowTag && (
                    <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">{eyebrowTag}</span>
                  )}
                  <p
                    className={`mt-1 line-clamp-2 text-card-title-sm font-bold leading-[1.3] tracking-tight ${
                      title.trim() ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {title.trim() || t("untitled")}
                  </p>
                  <textarea
                    value={excerpt}
                    onChange={(e) => onExcerptChange(e.target.value)}
                    maxLength={300}
                    rows={2}
                    placeholder={t("excerptPlaceholder")}
                    aria-label={t("excerptPlaceholder")}
                    className="mt-1.5 w-full resize-none border-b border-transparent bg-transparent text-[14px] leading-relaxed text-slate-500 outline-none transition-colors placeholder:text-slate-400 focus:border-accent-400 dark:text-slate-400 dark:focus:border-accent-500"
                  />
                  {/* Count only as the cap nears — a standing 47/300 under every 요약 was noise. */}
                  {excerpt.length >= 270 && <CharCount value={excerpt} max={300} />}
                  {/* Meta mirrors FeedCard's MetaRow (mt-2 · avatar · name · date). Auth carries no
                      avatarUrl, so the disc falls back to the initial — the same rendering an
                      avatar-less author gets in the real feed; not worth a profile fetch here. */}
                  <p className="mt-2 flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Avatar src={null} name={me?.username ?? ""} size="xs" />
                      <span className="truncate font-medium">{me?.username}</span>
                    </span>
                    <span aria-hidden>·</span>
                    <span className="shrink-0">{todayLabel}</span>
                  </p>
                </div>
                {cover && (
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-800 sm:h-24 sm:w-32">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </div>
            {/* 커버 조작 한 줄 — 자동 적용 출처 라벨 + 교체/제거, 커버가 없으면 추가(+본문 첫 이미지). */}
            <div className="mt-1.5 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 px-1">
              {uploading ? (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("coverUploading")}
                </span>
              ) : cover ? (
                <>
                  {autoCover && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{t("coverAuto")}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="focus-ring rounded px-1 text-[12px] font-medium text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-300"
                  >
                    {t("coverReplace")}
                  </button>
                  <button
                    type="button"
                    onClick={removeCover}
                    className="focus-ring rounded px-1 text-[12px] font-medium text-slate-500 transition-colors hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                  >
                    {t("coverRemove")}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="focus-ring inline-flex items-center gap-1.5 rounded px-1 text-[12px] font-medium text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-300"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    {t("coverAdd")}
                  </button>
                  {coverSuggestion && (
                    <button
                      type="button"
                      onClick={() => {
                        setAutoCover(false); // tapped back on deliberately — no machine label
                        onCoverChange(coverSuggestion);
                      }}
                      className="focus-ring rounded px-1 text-[12px] text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-300"
                    >
                      {t("coverFromBody")}
                    </button>
                  )}
                </>
              )}
            </div>
            {coverError && (
              <p className="mt-1 text-[12px] text-red-600 dark:text-red-400" role="alert">
                {coverError}
              </p>
            )}
          </section>

          {/* 태그 — the one required field. A standing hint isn't needed: the placeholder carries the
              how-to, and the * + a failed-publish nudge carry the "required" signal. */}
          <div ref={tagsFieldRef} className="mt-5 scroll-mt-4">
            <Field label={t("tags")} required>
              <TagInput
                tags={tags}
                onChange={onTagsChange}
                suggestions={tagSuggestions}
                placeholder={t("tagsPlaceholder")}
              />
              {showTagNudge && (
                <p className="mt-1.5 text-[12px] font-medium text-amber-600 dark:text-amber-400" role="alert">
                  {t("tagsRequired")}
                </p>
              )}
            </Field>
          </div>

          {(status === "DRAFT" || status === "SCHEDULED") && (
            <div className="mt-5">
              <Field label={t("publishTiming")}>
                {status === "DRAFT" && (
                  <div
                    role="radiogroup"
                    aria-label={t("publishTiming")}
                    className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800"
                  >
                    <button type="button" onClick={() => setShowSchedule(false)} role="radio" aria-checked={!showSchedule} className={segBtn(!showSchedule)}>
                      {t("publishNow")}
                    </button>
                    <button type="button" onClick={() => setShowSchedule(true)} role="radio" aria-checked={showSchedule} className={segBtn(showSchedule)}>
                      {t("schedule")}
                    </button>
                  </div>
                )}
                {(status === "SCHEDULED" || showSchedule) && (
                  <input
                    type="datetime-local"
                    min={localMin}
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    aria-label={t("publishTiming")}
                    className={`w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-accent-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:[color-scheme:dark] ${status === "DRAFT" ? "mt-2" : ""}`}
                  />
                )}
              </Field>
            </div>
          )}

          {/* ── 추가 설정: 매번 정하지 않는 것들(시리즈 · 주소)은 접어 둔다.
              발행 주소만은 접힌 줄에서도 읽히게 — 어디로 나가는지는 펼치지 않아도 보여야 한다. */}
          <div className="mt-5 border-t border-slate-100 pt-1.5 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
              className="focus-ring flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                {t("advancedSettings")}
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                />
              </span>
              <span className="min-w-0 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {addressPrefix}
                {slug}
              </span>
            </button>

            {showAdvanced && (
              <div className="space-y-5 px-1 pb-1.5 pt-2">
                {/* 시리즈 */}
                <Field label={t("series")}>
                  <SeriesSelect
                    value={seriesId}
                    onChange={onSeriesChange}
                    noneLabel={t("seriesNone")}
                    emptyHint={t("seriesEmptyHint")}
                  />
                </Field>

                {/* slug — 초안 동안만 편집. 발행 후 고정되므로 미리 경고. */}
                <Field
                  label={t("slugLabel")}
                  hint={status === "DRAFT" ? t("slugFreezeWarn") : undefined}
                >
                  {status === "DRAFT" ? (
                    <>
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
                          aria-label={t("slugLabel")}
                          aria-invalid={slugInvalid || Boolean(slugError)}
                          aria-describedby={
                            slugInvalid ? "publish-slug-invalid" : slugError ? "publish-slug-error" : undefined
                          }
                          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[13px] text-slate-700 outline-none transition-colors focus:border-accent-400 aria-[invalid=true]:border-red-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-accent-500 dark:aria-[invalid=true]:border-red-500"
                        />
                      </div>
                      {slugInvalid && (
                        <p id="publish-slug-invalid" className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                          {t("slugInvalid")}
                        </p>
                      )}
                      {!slugInvalid && slugError && (
                        <p
                          id="publish-slug-error"
                          ref={slugErrorRef}
                          className="mt-1 text-[11px] text-red-600 dark:text-red-400"
                        >
                          {slugError}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="truncate font-mono text-[13px] text-slate-500 dark:text-slate-400">
                      {addressPrefix}
                      {slug}
                    </p>
                  )}
                </Field>

              </div>
            )}
          </div>
        </div>

        {/* Footer — status-aware actions */}
        <footer className="border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
          {takenDown && <TakenDownNotice id={TAKEN_DOWN_NOTICE_ID} className="mb-2.5" />}
          {/* Action error (failed publish/schedule/save) — keeps the dialog open with the reason so a
              failed action never reads as a silent success. */}
          {error && (
            <p className="mb-2.5 text-[13px] text-red-600 dark:text-red-400" role="alert">
              {error === slugError ? t("slugCheck") : error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {status === "SCHEDULED" && scheduledAt && (
              <span className="text-[12px] text-slate-500 dark:text-slate-400">
                {t("scheduledFor", { when: scheduledLabel(scheduledAt, locale) })}
              </span>
            )}
            {previewAction}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Standalone save only where no action saves: a draft autosaves, 변경사항 저장 saves a live post,
                and a scheduled post's actions save first. */}
            {status === "UNPUBLISHED" && (
              <button
                type="button"
                onClick={async () => {
                  await onSave();
                }}
                disabled={saving || busy}
                className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
              >
                {saving ? t("saving") : t("save")}
              </button>
            )}
            <PrimaryAction
              status={status}
              takenDown={takenDown}
              busy={busy}
              scheduleMode={showSchedule}
              scheduleReady={Boolean(scheduleAt)}
              rescheduleReady={Boolean(scheduleAt) && scheduleAt !== scheduledInput}
              t={t}
              // Close ONLY when the lifecycle action actually succeeds — a failed publish/schedule
              // (no title, server 409, …) keeps the dialog open with the error in the footer, instead
              // of closing and reading as a phantom "published".
              onPublish={async () => {
                // Teachable click instead of a dead button: no topics → scroll the tag field up and
                // flag it, don't fire /publish.
                if (!canPublish) {
                  setTagNudge(true);
                  tagsFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  return;
                }
                // Save first, and abort the publish if it didn't land — otherwise we'd publish a stale
                // server snapshot (missing the last edits) and the save error would be wiped by the
                // lifecycle call. The error stays in the footer with the dialog open.
                if ((await onSave()) === false) return;
                const ok =
                  showSchedule && scheduleAt
                    ? await onSchedule(scheduleAt)
                    : await onChangeStatus("publish");
                if (ok) onClose();
              }}
              onSaveChanges={async () => {
                // Don't close on a failed save — that would read as a phantom success and drop the edits.
                if ((await onSave()) === false) return;
                onClose();
              }}
              // Persist pending edits BEFORE the status flip — otherwise editing then Republish /
              // Cancel-schedule / Unpublish silently drops the new content (changeStatus only POSTs the
              // lifecycle endpoint, it doesn't save blocks/meta). Matches Publish / Save changes.
              onUnpublish={async () => {
                const ok = await confirm({
                  title: t("unpublishConfirmTitle"),
                  description: t("unpublishConfirmDescription"),
                  confirmLabel: t("unpublish"),
                  destructive: true,
                });
                if (!ok) return;
                if ((await onSave()) === false) return;
                await onChangeStatus("unpublish");
              }}
              onRepublish={async () => {
                if (!canPublish) {
                  setTagNudge(true);
                  tagsFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  return;
                }
                if ((await onSave()) === false) return;
                await onChangeStatus("republish");
              }}
              onReschedule={async () => {
                if (await onSchedule(scheduleAt)) onClose();
              }}
              onPublishNow={async () => {
                if ((await onSave()) === false) return;
                if (await onChangeStatus("publish")) onClose();
              }}
              onCancelSchedule={async () => {
                const ok = await confirm({
                  title: t("cancelScheduleConfirmTitle"),
                  description: t("cancelScheduleConfirmDescription"),
                  confirmLabel: t("cancelSchedule"),
                  destructive: true,
                });
                if (ok) await onCancelSchedule();
              }}
            />
          </div>
          </div>
        </footer>
      </div>
      {confirmDialog}
    </div>
  );
}

/** Segmented-control button — the house segment: white on the gray track, ink text. */
function segBtn(active: boolean) {
  return `focus-ring min-h-9 rounded-md px-3 text-[13px] font-medium transition-colors ${
    active
      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
  }`;
}

/** Right-aligned character counter for a length-capped field; warns (amber) within 10% of the cap. */
function CharCount({ value, max }: { value: string; max: number }) {
  const n = value.length;
  const near = n >= max * 0.9;
  return (
    <p
      className={`mt-1 text-right text-[11px] tabular-nums ${
        near ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"
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
  takenDown,
  busy,
  scheduleMode,
  scheduleReady,
  rescheduleReady,
  t,
  onPublish,
  onSaveChanges,
  onUnpublish,
  onRepublish,
  onReschedule,
  onPublishNow,
  onCancelSchedule,
}: {
  status: PostStatus;
  takenDown: boolean;
  busy: boolean;
  /** The schedule panel is open — the primary action parks the post instead of publishing now. */
  scheduleMode: boolean;
  /** A publish time has been picked; gates the schedule action so an empty time can't fall through. */
  scheduleReady: boolean;
  rescheduleReady: boolean;
  t: ReturnType<typeof useTranslations>;
  onPublish: () => void;
  onSaveChanges: () => void;
  onUnpublish: () => void;
  onRepublish: () => void;
  onReschedule: () => void;
  onPublishNow: () => void;
  onCancelSchedule: () => void;
}) {
  const solid =
    "focus-ring inline-flex items-center gap-1.5 rounded-lg bg-accent-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-800 disabled:opacity-50";
  if (takenDown && (status === "DRAFT" || status === "UNPUBLISHED"))
    return (
      <button
        type="button"
        disabled
        aria-describedby={TAKEN_DOWN_NOTICE_ID}
        title={t("takenDownBlocked")}
        className={solid}
      >
        {status === "DRAFT" ? t("publish") : t("republish")}
      </button>
    );
  if (status === "DRAFT") {
    // The tag requirement is a teachable click (onPublish nudges the tag field) rather than a
    // disabled button, so Publish/Schedule stay enabled. Schedule still gates on a picked time —
    // that input sits right there, so it's not a silent dead-end.
    if (scheduleMode)
      return (
        <button
          type="button"
          onClick={onPublish}
          disabled={busy || !scheduleReady}
          title={!scheduleReady ? t("scheduleInvalid") : undefined}
          className={solid}
        >
          <CalendarClock className="h-4 w-4" />
          {t("scheduleConfirm")}
        </button>
      );
    return (
      <button type="button" onClick={onPublish} disabled={busy} className={solid}>
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
      <button type="button" onClick={onRepublish} disabled={busy} className={solid}>
        {t("republish")}
      </button>
    );
  // SCHEDULED
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCancelSchedule}
        disabled={busy}
        className="focus-ring rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/15"
      >
        {t("cancelSchedule")}
      </button>
      <button
        type="button"
        onClick={onReschedule}
        disabled={busy || !rescheduleReady}
        className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
      >
        <CalendarClock className="h-4 w-4" />
        {t("reschedule")}
      </button>
      <button type="button" onClick={onPublishNow} disabled={busy} className={solid}>
        <Check className="h-4 w-4" />
        {t("publishNow")}
      </button>
    </div>
  );
}

/** A stored instant as the value a datetime-local field shows: the author's own wall-clock time. */
function toLocalInput(iso: string): string {
  const at = new Date(iso);
  return new Date(at.getTime() - at.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
