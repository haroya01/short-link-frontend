"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const fileInput = useRef<HTMLInputElement>(null);
  const noticeChecked = useRef(false);

  const length = noteLength(body);
  const uploading = images.some((image) => image.key === null);
  const canPost =
    !posting && !uploading && length <= NOTE_MAX_LENGTH && (length > 0 || images.length > 0);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    const room = NOTE_MAX_IMAGES - images.length;
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) setError(t("imageLimit", { max: NOTE_MAX_IMAGES }));
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

  return (
    <div className="rounded-2xl border border-slate-200 p-4 transition-colors focus-within:border-slate-400 dark:border-slate-800 dark:focus-within:border-slate-600">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={inReplyToId ? 2 : 3}
        placeholder={inReplyToId ? t("replyPlaceholder") : t("composerPlaceholder")}
        aria-label={inReplyToId ? t("replyPlaceholder") : t("composerPlaceholder")}
        className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
      />

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

      <div className="mt-3 flex items-center gap-3">
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
          className="focus-ring rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ImagePlus className="h-5 w-5" aria-hidden />
        </button>
        <span
          className={cn(
            "ml-auto text-[12px] tabular-nums",
            length > NOTE_MAX_LENGTH ? "text-red-600 dark:text-red-400" : "text-slate-400",
          )}
          aria-live="polite"
        >
          {length > NOTE_MAX_LENGTH
            ? t("tooLong", { max: NOTE_MAX_LENGTH })
            : t("counter", { count: length, max: NOTE_MAX_LENGTH })}
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={!canPost}
          className="focus-ring rounded-lg bg-accent-700 px-4 py-2 text-[14px] font-medium text-white hover:bg-accent-800 disabled:opacity-50"
        >
          {posting ? t("posting") : inReplyToId ? t("replySubmit") : t("submit")}
        </button>
      </div>
      {confirmDialog}
    </div>
  );
}
