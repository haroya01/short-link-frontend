"use client";

import { useEffect, useRef, useState } from "react";
import { ChartBar, Check, Clock, EyeOff, ImagePlus, Loader2, TriangleAlert, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/use-confirm";
import { useToast } from "@/components/ui/toast";
import {
  createNote,
  getFederationSettings,
  scheduleNote,
  NOTE_ALT_MAX_LENGTH,
  NOTE_MAX_IMAGES,
  NOTE_MAX_LENGTH,
  NOTE_MAX_WARNING_LENGTH,
  NoteImageUploadError,
  updateFederationSettings,
  uploadNoteImage,
  type Note,
  type NotePollDraft,
  type NoteVisibility,
  type NoteLinkPreview,
  type QuotedNote,
  type QuotedPost,
} from "@/modules/notes/api/notes";
import { noteLength, previewUrl } from "@/modules/notes/lib/note-text";
import { languageName, NOTE_LANGUAGES, postingLanguage, rememberLanguage } from "@/modules/notes/lib/note-languages";
import { getLinkPreview } from "@/modules/blog/api/public-posts";
import { Avatar } from "@/modules/blog/components/avatar";
import { NoteLengthRing } from "./note-card";
import { VisibilityIcon } from "./note-visibility";
import { NoteLinkCard } from "./note-link-card";
import { emptyPoll, NotePollEditor, pollReady } from "./note-poll";
import { QuotedNoteCard } from "./quoted-note-card";
import { QuotedPostCard } from "./quoted-post-card";
import { defaultLocal, earliestLocal, scheduleError, ScheduledNotesPanel, useWhen } from "./scheduled-notes";

type PendingImage = {
  id: string;
  previewUrl: string;
  key: string | null;
  altText: string;
};

export function NoteComposer({
  onCreated,
  inReplyToId = null,
  quote = null,
  onClearQuote,
  quotedNote = null,
  autoFocus = false,
}: {
  onCreated: (note: Note) => void;
  inReplyToId?: number | null;
  quote?: QuotedPost | null;
  onClearQuote?: () => void;
  quotedNote?: QuotedNote | null;
  autoFocus?: boolean;
}) {
  const t = useTranslations("notes");
  const [confirm, confirmDialog] = useConfirm();
  const [body, setBody] = useState("");
  const [warns, setWarns] = useState(false);
  const [warning, setWarning] = useState("");
  const [sensitive, setSensitive] = useState(false);
  const [visibility, setVisibility] = useState<NoteVisibility | null>(inReplyToId ? null : "public");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const [altEditing, setAltEditing] = useState<string | null>(null);
  const [poll, setPoll] = useState<NotePollDraft | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const locale = useLocale();
  const [language, setLanguage] = useState(() => locale.split("-")[0]);
  useEffect(() => setLanguage(postingLanguage(locale)), [locale]);
  const [scheduledVersion, setScheduledVersion] = useState(0);
  const { toast } = useToast();
  const when = useWhen();
  const { me } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const noticeChecked = useRef(false);
  const [linkCard, setLinkCard] = useState<NoteLinkPreview | null>(null);
  const cardUrl = previewUrl(body, images.length > 0 || poll !== null, quote !== null || quotedNote !== null);

  useEffect(() => {
    if (!cardUrl) {
      setLinkCard(null);
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      getLinkPreview(cardUrl)
        .then((result) => {
          if (!live) return;
          const data = result.ok ? result.data : null;
          setLinkCard(data && (data.title || data.image) ? data : null);
        })
        .catch(() => live && setLinkCard(null));
    }, 500);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [cardUrl]);

  const length = noteLength(body);
  const uploading = images.some((image) => image.key === null);
  const canPost =
    !posting &&
    !uploading &&
    length <= NOTE_MAX_LENGTH &&
    (length > 0 || images.length > 0) &&
    (poll === null || (pollReady(poll) && length > 0));
  const open =
    focused ||
    length > 0 ||
    images.length > 0 ||
    poll !== null ||
    quote !== null ||
    quotedNote !== null ||
    error !== null;
  const textarea = useRef<HTMLTextAreaElement>(null);
  const placeholder = inReplyToId
    ? t("replyPlaceholder")
    : quotedNote || quote
      ? t("quotePlaceholder")
      : t("composerPlaceholder");

  async function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    const all = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (all.length === 0) return;
    setError(null);
    const room = NOTE_MAX_IMAGES - images.length;
    const picked = all.slice(0, room);
    if (all.length > room) setError(t("imageLimit", { max: NOTE_MAX_IMAGES }));
    for (const file of picked) {
      const id = `${file.name}-${file.size}-${Math.random()}`;
      setImages((current) => [
        ...current,
        { id, previewUrl: URL.createObjectURL(file), key: null, altText: "" },
      ]);
      try {
        const uploaded = await uploadNoteImage(file);
        setImages((current) =>
          current.map((image) => (image.id === id ? { ...image, key: uploaded.key } : image)),
        );
      } catch (e) {
        setImages((current) => current.filter((image) => image.id !== id));
        const code = e instanceof NoteImageUploadError ? e.code : "upload-failed";
        setError(
          code === "not-image"
            ? t("imageNotImage")
            : code === "too-large"
              ? t("imageTooLarge")
              : t("imageFailed"),
        );
      }
    }
  }

  async function acknowledgeFederation(): Promise<boolean> {
    if (noticeChecked.current) return true;
    let needsNotice = true;
    try {
      const settings = await getFederationSettings();
      needsNotice = settings.enabled && !settings.noticeSeen;
    } catch {
      needsNotice = true;
    }
    if (needsNotice) {
      const ok = await confirm({
        title: t("noticeTitle"),
        description: t("noticeBody"),
        confirmLabel: t("noticeConfirm"),
      });
      if (!ok) return false;
      updateFederationSettings({ noticeSeen: true }).catch(() => undefined);
    }
    noticeChecked.current = true;
    return true;
  }

  async function submit() {
    if (!canPost) return;
    setError(null);
    if (!(await acknowledgeFederation())) return;
    setPosting(true);
    try {
      const draft = {
        body,
        images: images.map((image) => ({ key: image.key as string, altText: image.altText })),
        quotedPostId: quote?.id ?? null,
        inReplyToId,
        quotedNoteId: quotedNote?.id ?? null,
        contentWarning: warns && warning.trim() ? warning.trim() : null,
        sensitive: images.length > 0 && sensitive,
        visibility,
        poll: poll ? { ...poll, options: poll.options.map((option) => option.trim()) } : null,
        language,
      };
      rememberLanguage(language);
      if (scheduledAt) {
        let scheduled;
        try {
          scheduled = await scheduleNote(draft, new Date(scheduledAt).toISOString());
        } catch (e) {
          setError(t(scheduleError(e)));
          return;
        }
        toast(t("scheduledToast", { when: when(scheduled.scheduledAt) }));
        setScheduledAt("");
        setScheduledVersion((v) => v + 1);
      }
      const note = scheduledAt ? null : await createNote(draft);
      images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      setPoll(null);
      setBody("");
      setImages([]);
      setWarns(false);
      setWarning("");
      setSensitive(false);
      setVisibility(inReplyToId ? null : "public");
      onClearQuote?.();
      if (note) onCreated(!note.linkPreview && linkCard ? { ...note, linkPreview: linkCard } : note);
      setLinkCard(null);
    } catch {
      setError(t("postFailed"));
    } finally {
      setPosting(false);
    }
  }

  const submitButton = (
    <button
      type="button"
      onClick={submit}
      disabled={!canPost}
      className={cn(
        "focus-ring shrink-0 rounded-full border px-4 py-1.5 text-[14px] font-semibold transition-colors disabled:cursor-default",
        canPost
          ? "border-accent-700 bg-accent-700 text-white hover:border-accent-800 hover:bg-accent-800"
          : "border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-500",
      )}
    >
      {posting ? t("posting") : scheduledAt ? t("scheduleSubmit") : inReplyToId ? t("replySubmit") : t("submit")}
    </button>
  );

  return (
    <div
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) textarea.current?.focus();
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files.length === 0) return;
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex gap-3 rounded-surface py-3 transition-colors",
        dragging && "bg-accent-50/60 outline-dashed outline-1 outline-accent-600 dark:bg-accent-500/10",
      )}
    >
      <Avatar src={me?.avatarUrl ?? null} name={me?.username ?? "?"} size="md" />
      <div className="min-w-0 flex-1">
        {warns && (
          <input
            value={warning}
            onChange={(e) => setWarning(e.target.value)}
            maxLength={NOTE_MAX_WARNING_LENGTH}
            placeholder={t("warningPlaceholder")}
            aria-label={t("warningLabel")}
            className="focus-ring mb-1.5 w-full rounded-surface bg-slate-100 px-3 py-1.5 text-[15px] font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        )}
        <div className="flex items-start gap-3">
          <textarea
            ref={textarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            onPaste={(e) => {
              const pasted = Array.from(e.clipboardData.files).filter((file) => file.type.startsWith("image/"));
              if (pasted.length === 0) return;
              e.preventDefault();
              addFiles(pasted);
            }}
            rows={1}
            autoFocus={autoFocus}
            placeholder={placeholder}
            aria-label={placeholder}
            className={cn(
              "max-h-[50vh] w-full resize-none bg-transparent py-1.5 text-[15px] leading-6 text-slate-900 outline-none [field-sizing:content] placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500",
              open && !inReplyToId ? "min-h-[2lh]" : "min-h-[1lh]",
            )}
          />
          {!open && submitButton}
        </div>
      {poll && <NotePollEditor poll={poll} onChange={setPoll} />}
      {images.length > 0 && (
        <div className="-mr-4 mt-2 flex gap-2 overflow-x-auto pr-4 [scrollbar-width:none] sm:mr-0 sm:pr-0 [&::-webkit-scrollbar]:hidden">
          {images.map((image) => (
            <figure key={image.id} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.previewUrl}
                alt={image.altText}
                className={cn(
                  "block h-44 w-auto min-w-24 max-w-none rounded-surface border border-slate-200 bg-slate-100 object-cover dark:border-slate-800 dark:bg-slate-900",
                  image.key === null && "opacity-60",
                )}
              />
              {image.key === null && (
                <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-slate-600" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(image.previewUrl);
                  setImages((current) => current.filter((x) => x.id !== image.id));
                  if (altEditing === image.id) setAltEditing(null);
                }}
                aria-label={t("removeImage")}
                className="focus-ring absolute right-1.5 top-1.5 rounded-full bg-slate-950/65 p-1 text-white hover:bg-slate-950/85"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setAltEditing((current) => (current === image.id ? null : image.id))}
                aria-label={t("addAlt")}
                aria-expanded={altEditing === image.id}
                className="focus-ring absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-full bg-slate-950/65 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-slate-950/85"
              >
                {image.altText ? (
                  <>
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                    ALT
                  </>
                ) : (
                  "+ALT"
                )}
              </button>
            </figure>
          ))}
        </div>
      )}

      {altEditing !== null && images.some((image) => image.id === altEditing) && (
        <div className="mt-2 rounded-surface border border-slate-200 p-3 dark:border-slate-800">
          <label htmlFor="note-alt" className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
            {t("altLabel")}
          </label>
          <textarea
            id="note-alt"
            autoFocus
            rows={2}
            maxLength={NOTE_ALT_MAX_LENGTH}
            value={images.find((image) => image.id === altEditing)?.altText ?? ""}
            onChange={(e) =>
              setImages((current) =>
                current.map((x) => (x.id === altEditing ? { ...x, altText: e.target.value } : x)),
              )
            }
            placeholder={t("altPlaceholder")}
            className="mt-1 w-full resize-none bg-transparent text-[14px] leading-relaxed text-slate-900 outline-none [field-sizing:content] placeholder:text-slate-400 dark:text-slate-100"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setAltEditing(null)}
              className="focus-ring rounded-full border border-slate-300 px-3 py-1 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
            >
              {t("done")}
            </button>
          </div>
        </div>
      )}

      {quote && (
        <div className="relative">
          <QuotedPostCard post={quote} linked={false} />
          {onClearQuote && (
            <button
              type="button"
              onClick={onClearQuote}
              aria-label={t("removeQuote")}
              className="focus-ring absolute right-2 top-2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      )}

      {quotedNote && <QuotedNoteCard note={quotedNote} linked={false} />}
      {cardUrl && linkCard && linkCard.url === cardUrl && <NoteLinkCard preview={linkCard} linked={false} />}

      {scheduledAt && (
        <div className="mt-2 flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <label className="inline-flex items-center gap-2">
            {t("scheduleLabel")}
            <input
              type="datetime-local"
              value={scheduledAt}
              min={earliestLocal()}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="focus-ring rounded-surface border border-slate-200 bg-transparent px-2 py-1 text-[13px] dark:border-slate-700"
            />
          </label>
          <button
            type="button"
            onClick={() => setScheduledAt("")}
            aria-label={t("scheduleRemove")}
            className="focus-ring rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[13px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

        {open && (
          <div className="-ml-1.5 mt-1 flex items-center gap-3">
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={images.length >= NOTE_MAX_IMAGES || poll !== null}
              aria-label={t("addImage")}
              title={t("addImage")}
              className="focus-ring rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <ImagePlus className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setPoll((current) => (current ? null : emptyPoll()))}
              disabled={images.length > 0}
              aria-pressed={poll !== null}
              aria-label={poll ? t("pollRemove") : t("pollAdd")}
              title={poll ? t("pollRemove") : t("pollAdd")}
              className={cn(
                "focus-ring rounded-full p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800",
                poll
                  ? "text-slate-900 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              <ChartBar className="h-5 w-5" strokeWidth={poll ? 2.25 : 1.75} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setWarns((on) => !on)}
              aria-pressed={warns}
              aria-label={t("warningToggle")}
              title={t("warningToggle")}
              className={cn(
                "focus-ring rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800",
                warns
                  ? "text-slate-900 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              <TriangleAlert className="h-5 w-5" strokeWidth={warns ? 2.25 : 1.75} aria-hidden />
            </button>
            {images.length > 0 && !warns && (
              <button
                type="button"
                onClick={() => setSensitive((on) => !on)}
                aria-pressed={sensitive}
                aria-label={t("sensitiveToggle")}
                title={t("sensitiveToggle")}
                className={cn(
                  "focus-ring rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800",
                  sensitive
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                <EyeOff className="h-5 w-5" strokeWidth={sensitive ? 2.25 : 1.75} aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={() => setScheduledAt((current) => (current ? "" : defaultLocal()))}
              aria-pressed={scheduledAt !== ""}
              aria-label={t("scheduleToggle")}
              title={t("scheduleToggle")}
              className={cn(
                "focus-ring rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800",
                scheduledAt
                  ? "text-slate-900 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              <Clock className="h-5 w-5" strokeWidth={scheduledAt ? 2.25 : 1.75} aria-hidden />
            </button>
            <label className="relative inline-flex min-w-0 items-center gap-1 text-[13px] text-slate-500 dark:text-slate-400">
              <VisibilityIcon visibility={visibility ?? "public"} className="h-3.5 w-3.5 shrink-0" />
              <select
                value={visibility ?? ""}
                onChange={(e) => setVisibility((e.target.value || null) as NoteVisibility | null)}
                aria-label={t("visibilityLabel")}
                className="focus-ring min-w-0 cursor-pointer appearance-none truncate rounded bg-transparent pr-1 hover:text-slate-800 dark:hover:text-slate-200"
              >
                {inReplyToId && <option value="">{t("visibilitySameAsParent")}</option>}
                <option value="public">{t("visibilityPublic")}</option>
                <option value="unlisted">{t("visibilityUnlisted")}</option>
                <option value="private">{t("visibilityPrivate")}</option>
                <option value="direct">{t("visibilityDirect")}</option>
              </select>
            </label>
            <div className="ml-auto flex items-center gap-3">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                aria-label={t("languageLabel")}
                title={languageName(language)}
                className="focus-ring cursor-pointer appearance-none rounded bg-transparent text-[13px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {NOTE_LANGUAGES.map((code) => (
                  <option key={code} value={code}>
                    {languageName(code)}
                  </option>
                ))}
              </select>
              <NoteLengthRing length={length} />
              {submitButton}
            </div>
          </div>
        )}
        {!inReplyToId && <ScheduledNotesPanel version={scheduledVersion} />}
      </div>
      {confirmDialog}
    </div>
  );
}

export function NoteSignInRow({ label, placeholder }: { label: string; placeholder: string }) {
  const tNav = useTranslations("nav");
  const { signInWithGoogle } = useAuth();
  return (
    <button
      type="button"
      onClick={signInWithGoogle}
      aria-label={label}
      className="group flex w-full items-center gap-3 rounded-surface py-3 text-left focus-ring"
    >
      <span aria-hidden className="h-9 w-9 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800" />
      <span className="min-w-0 flex-1 truncate text-[15px] text-slate-400 dark:text-slate-500">
        {placeholder}
      </span>
      <span className="shrink-0 rounded-full border border-slate-900 px-4 py-1.5 text-[14px] font-semibold text-slate-900 transition-colors group-hover:bg-slate-900 group-hover:text-white dark:border-slate-100 dark:text-slate-100 dark:group-hover:bg-slate-100 dark:group-hover:text-slate-900">
        {tNav("login")}
      </span>
    </button>
  );
}
