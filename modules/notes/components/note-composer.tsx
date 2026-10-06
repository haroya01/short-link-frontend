"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/use-confirm";
import {
  createNote,
  getFederationSettings,
  NOTE_ALT_MAX_LENGTH,
  NOTE_MAX_IMAGES,
  NOTE_MAX_LENGTH,
  NoteImageUploadError,
  updateFederationSettings,
  uploadNoteImage,
  type Note,
  type QuotedPost,
} from "@/modules/notes/api/notes";
import { noteLength } from "@/modules/notes/lib/note-text";
import { Avatar } from "@/modules/blog/components/avatar";
import { NoteCounter } from "./note-card";

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
}: {
  onCreated: (note: Note) => void;
  inReplyToId?: number | null;
  quote?: QuotedPost | null;
  onClearQuote?: () => void;
}) {
  const t = useTranslations("notes");
  const [confirm, confirmDialog] = useConfirm();
  const [body, setBody] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const { me } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const noticeChecked = useRef(false);

  const length = noteLength(body);
  const uploading = images.some((image) => image.key === null);
  const canPost =
    !posting && !uploading && length <= NOTE_MAX_LENGTH && (length > 0 || images.length > 0);
  const open = focused || length > 0 || images.length > 0 || quote !== null || error !== null;
  const textarea = useRef<HTMLTextAreaElement>(null);

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
      const note = await createNote({
        body,
        images: images.map((image) => ({ key: image.key as string, altText: image.altText })),
        quotedPostId: quote?.id ?? null,
        inReplyToId,
      });
      images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      setBody("");
      setImages([]);
      onClearQuote?.();
      onCreated(note);
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
          ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          : "border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-500",
      )}
    >
      {posting ? t("posting") : inReplyToId ? t("replySubmit") : t("submit")}
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
        "flex gap-3 rounded-2xl py-3 transition-colors",
        dragging && "bg-accent-50/60 outline-dashed outline-1 outline-accent-600 dark:bg-accent-500/10",
      )}
    >
      <Avatar src={me?.avatarUrl ?? null} name={me?.username ?? "?"} size="md" />
      <div className="min-w-0 flex-1">
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
            placeholder={inReplyToId ? t("replyPlaceholder") : t("composerPlaceholder")}
            aria-label={inReplyToId ? t("replyPlaceholder") : t("composerPlaceholder")}
            className={cn(
              "max-h-[50vh] w-full resize-none bg-transparent py-1.5 text-[15px] leading-6 text-slate-900 outline-none [field-sizing:content] placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500",
              open && !inReplyToId ? "min-h-[2lh]" : "min-h-[1lh]",
            )}
          />
          {!open && submitButton}
        </div>
      {images.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.id} className="flex flex-col gap-1.5">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.previewUrl}
                  alt=""
                  className={cn(
                    "aspect-square w-full rounded-lg border border-slate-200 object-cover dark:border-slate-800",
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
                  }}
                  aria-label={t("removeImage")}
                  className="focus-ring absolute right-1 top-1 rounded-full bg-slate-900/70 p-1 text-white hover:bg-slate-900"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <label className="sr-only" htmlFor={`alt-${image.id}`}>
                {t("altLabel")} {index + 1}
              </label>
              <input
                id={`alt-${image.id}`}
                value={image.altText}
                maxLength={NOTE_ALT_MAX_LENGTH}
                onChange={(e) =>
                  setImages((current) =>
                    current.map((x) => (x.id === image.id ? { ...x, altText: e.target.value } : x)),
                  )
                }
                placeholder={t("altLabel")}
                title={t("altPlaceholder")}
                className="focus-ring w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </li>
          ))}
        </ul>
      )}

      {quote && (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
          <div className="min-w-0">
            <span className="block text-[12px] text-slate-500 dark:text-slate-400">{t("quoting")}</span>
            <span className="block truncate text-[14px] font-medium text-slate-900 dark:text-slate-100">
              {quote.title}
            </span>
          </div>
          {onClearQuote && (
            <button
              type="button"
              onClick={onClearQuote}
              aria-label={t("removeQuote")}
              className="focus-ring rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
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
              disabled={images.length >= NOTE_MAX_IMAGES}
              aria-label={t("addImage")}
              title={t("addImage")}
              className="focus-ring rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <ImagePlus className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </button>
            <div className="ml-auto flex items-center gap-3">
              <NoteCounter length={length} />
              {submitButton}
            </div>
          </div>
        )}
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
      className="group flex w-full items-center gap-3 rounded-2xl py-3 text-left focus-ring"
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
