"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import type { useTranslations } from "next-intl";
import {
  commitProfileImageUpload,
  presignProfileImageUpload,
  uploadAvatarToS3,
} from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { useToast } from "@/components/ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";

const MAX_IMAGES = 6;
const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.9;
const MAX_DIM = 1600;

/**
 * One slot in the gallery editor. {@code status: "uploading"} renders a spinner placeholder until
 * the S3 commit returns, then transitions to {@code "done"} with a public URL. We track slots —
 * not raw URLs — so we can show progress + survive partial failure (one file fails, others stay).
 */
type Slot =
  | { id: string; status: "uploading" }
  | { id: string; status: "done"; url: string };

type Props = {
  open: boolean;
  initialJson: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (configJson: string) => void | Promise<void>;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * Gallery editor with bulk pick + parallel upload + drag-to-reorder. Visitors see the slides as
 * a horizontal swipe carousel on the public profile; this editor mirrors that flow by showing a
 * horizontal thumbnail strip with the first slot badged as the "cover" (the slide visitors land
 * on). Drag-and-drop within the strip rewrites the order — same HTML5 dataTransfer pattern the
 * profile feed editor uses elsewhere, no library needed.
 *
 * <p>Failure model: each file uploads independently. A failed upload toasts + drops only that
 * slot. Successful slots stay in place so the user doesn't lose work mid-batch.
 */
export function GalleryBlockDialog({ open, initialJson, onOpenChange, onSubmit, t }: Props) {
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [dropzoneHot, setDropzoneHot] = useState(false);
  // Sequential cropper queue. The user can pick N files at once via the dropzone; we crop them
  // one at a time so each photo gets the framing it deserves rather than a center-crop. The head
  // of the queue is shown in the cropper; on confirm/cancel we shift and advance to the next.
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const currentCropFile = cropQueue[0] ?? null;

  useEffect(() => {
    if (!open) return;
    setSlots([]);
    setDragIdx(null);
    setOverIdx(null);
    if (initialJson) {
      try {
        const parsed = JSON.parse(initialJson);
        if (Array.isArray(parsed?.images)) {
          const cleaned = parsed.images
            .filter((v: unknown): v is string => typeof v === "string" && v.length > 0)
            .map(
              (url: string, idx: number): Slot => ({
                id: `seed-${idx}`,
                status: "done",
                url,
              }),
            );
          setSlots(cleaned);
        }
      } catch {
        /* fall through to empty */
      }
    }
  }, [open, initialJson]);

  const doneSlots = slots.filter((s): s is Extract<Slot, { status: "done" }> => s.status === "done");
  const canSave = doneSlots.length > 0;
  const remaining = MAX_IMAGES - slots.length;

  async function uploadOne(file: File, slotId: string) {
    try {
      const presign = await presignProfileImageUpload(OUTPUT_TYPE);
      if (file.size > presign.maxBytes) {
        throw new Error("tooBig");
      }
      await uploadAvatarToS3(presign.uploadUrl, file, OUTPUT_TYPE);
      const committed = await commitProfileImageUpload(presign.key);
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId ? { id: s.id, status: "done", url: committed.imageUrl } : s,
        ),
      );
    } catch (err) {
      // Drop the failed slot but keep the others. One toast per failure is enough — bulk failure
      // (e.g. network down) will still feel readable since the slots disappear too.
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      toast(
        errorMessage(err, t("imageUploader.uploadFailed")),
        "error",
      );
    }
  }

  function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    const accepted = ACCEPT.split(",");
    const room = MAX_IMAGES - slots.length - cropQueue.length;
    if (room <= 0) {
      toast(t("galleryFullToast", { max: MAX_IMAGES }), "error");
      return;
    }
    const valid: File[] = [];
    for (const f of files) {
      if (valid.length >= room) break;
      if (!accepted.includes(f.type)) {
        toast(t("imageUploader.invalidType"), "error");
        continue;
      }
      if (f.size > MAX_INPUT_BYTES) {
        toast(t("imageUploader.tooBig"), "error");
        continue;
      }
      valid.push(f);
    }
    if (valid.length === 0) return;
    if (files.length > room) {
      toast(t("galleryTruncatedToast", { max: MAX_IMAGES }));
    }
    // Push picked files into the cropper queue. The cropper dialog opens for the first one;
    // confirming each one shifts the queue and advances to the next, so users can crop a batch in
    // a single flow without re-opening the file picker.
    setCropQueue((prev) => [...prev, ...valid]);
  }

  function handleCropConfirm(cropped: File) {
    setCropQueue((prev) => prev.slice(1));
    const slotId = `up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setSlots((prev) => [...prev, { id: slotId, status: "uploading" }]);
    void uploadOne(cropped, slotId);
  }

  function handleCropCancel() {
    // Cancel discards just the current file (head of the queue), keeping the rest of the batch.
    setCropQueue((prev) => prev.slice(1));
  }

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = ""; // allow re-selecting the same files later
    if (!files) return;
    handleFiles(files);
  }

  function handleDropzoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropzoneHot(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    handleFiles(e.dataTransfer.files);
  }

  function removeSlot(id: string) {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  }

  function onThumbDragStart(idx: number, e: React.DragEvent) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    // Required for Firefox to actually fire the drag.
    e.dataTransfer.setData("text/plain", String(idx));
  }

  function onThumbDragOver(idx: number, e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overIdx !== idx) setOverIdx(idx);
  }

  function onThumbDrop(targetIdx: number, e: React.DragEvent) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    setSlots((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDragIdx(null);
    setOverIdx(null);
  }

  function onThumbDragEnd() {
    setDragIdx(null);
    setOverIdx(null);
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialJson ? t("editGalleryTitle") : t("addGalleryTitle")}
      description={t("addGalleryDescriptionUpload", { max: MAX_IMAGES })}
      confirmLabel={t("save")}
      confirmDisabled={!canSave}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        await onSubmit(JSON.stringify({ images: doneSlots.map((s) => s.url) }));
      }}
    >
      <div className="space-y-3">
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            if (remaining <= 0) return;
            e.preventDefault();
            setDropzoneHot(true);
          }}
          onDragLeave={() => setDropzoneHot(false)}
          onDrop={handleDropzoneDrop}
          className={
            "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-6 text-center transition " +
            (remaining <= 0
              ? "cursor-not-allowed border-slate-200 bg-slate-50/50 text-slate-300"
              : dropzoneHot
                ? "border-accent-400 bg-accent-50 text-accent-700"
                : "border-slate-300 bg-slate-50/60 text-slate-600 hover:border-slate-400 hover:text-slate-800")
          }
        >
          <ImagePlus className="h-5 w-5" />
          <span className="text-[12px] font-medium">
            {remaining <= 0 ? t("galleryFull") : t("galleryDropzone")}
          </span>
          <span className="text-[10px] text-slate-500">
            {t("galleryCounter", { count: slots.length, max: MAX_IMAGES })}
          </span>
          <input
            ref={fileInput}
            id={inputId}
            type="file"
            multiple
            accept={ACCEPT}
            onChange={handlePick}
            className="hidden"
            disabled={remaining <= 0}
          />
        </label>

        {slots.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {slots.map((slot, idx) => {
                const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;
                const isDragging = dragIdx === idx;
                return (
                  <div
                    key={slot.id}
                    draggable={slot.status === "done"}
                    onDragStart={(e) => onThumbDragStart(idx, e)}
                    onDragOver={(e) => onThumbDragOver(idx, e)}
                    onDrop={(e) => onThumbDrop(idx, e)}
                    onDragEnd={onThumbDragEnd}
                    className={
                      "group relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-slate-100 transition " +
                      (isOver ? "ring-2 ring-accent-400 ring-offset-1" : "border-slate-200") +
                      (isDragging ? " opacity-50" : "")
                    }
                  >
                    {slot.status === "uploading" ? (
                      <span className="absolute inset-0 grid place-items-center text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </span>
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={slot.url}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        {idx === 0 && (
                          <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded bg-black/70 px-1 py-0.5 text-[10px] font-medium text-white">
                            <Star className="h-2 w-2 fill-current" />
                            {t("galleryCoverBadge")}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeSlot(slot.id)}
                          aria-label={t("remove")}
                          className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500">{t("galleryReorderHint")}</p>
          </div>
        )}
      </div>
      <ImageCropperDialog
        open={currentCropFile !== null}
        file={currentCropFile}
        aspect={4 / 3}
        cropShape="rect"
        outputMaxDim={MAX_DIM}
        outputType={OUTPUT_TYPE}
        outputQuality={OUTPUT_QUALITY}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
    </ConfirmDialog>
  );
}
