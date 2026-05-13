"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  commitProfileImageUpload,
  presignProfileImageUpload,
  uploadAvatarToS3,
} from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import type { ProductCardImage } from "@/types";
import { ConfirmDialog } from "../ui/dialog";
import { ImageCropperDialog } from "../ui/image-cropper-dialog";
import { Input } from "../ui/input";
import { useToast } from "../ui/toast";
import { FormField } from "./FormField";

const MAX_ITEMS = 8;
const MAX_IMAGES_PER_ITEM = 5;
const FOCAL_DEFAULT = 50;

const UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp";
const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const UPLOAD_OUTPUT_TYPE = "image/jpeg";
const UPLOAD_QUALITY = 0.9;
const UPLOAD_MAX_DIM = 1600;

type Badge = "" | "NEW" | "BEST" | "LIMITED" | "SOLD_OUT";

const BADGES: readonly Exclude<Badge, "">[] = ["NEW", "BEST", "LIMITED", "SOLD_OUT"];

type Item = {
  name: string;
  images: ProductCardImage[];
  price: string;
  originalPrice: string;
  badge: Badge;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
};

const EMPTY_ITEM: Item = {
  name: "",
  images: [],
  price: "",
  originalPrice: "",
  badge: "",
  description: "",
  ctaLabel: "",
  ctaUrl: "",
};

type Props = {
  open: boolean;
  initialJson: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (configJson: string) => void | Promise<void>;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * Multi-item editor for a PRODUCT_CARD block. Vertical list of expandable item rows — each row
 * holds optional fields except {@code name}. Backend caps at 8 items and 5 images per item; we
 * mirror those caps here so the user gets immediate feedback instead of a 400 after Save.
 *
 * <p>Each image has a focal point (0..100 % on each axis) stored alongside the URL. The dialog
 * exposes it as a draggable dot on the thumbnail — the seller drags it onto the part of the image
 * that must stay visible after {@code object-cover} crops the image on the public card. Live
 * preview at the top reflects the current draft so the seller sees the framing they'll get.
 *
 * <p>Backward compat: payloads with the legacy {@code image: string} field (one image per item,
 * no focal point) parse cleanly — handled in {@link parseImagesField}.
 */
type Layout = "carousel" | "grid";
const LAYOUTS: readonly Layout[] = ["carousel", "grid"];

export function ProductCardBlockDialog({ open, initialJson, onOpenChange, onSubmit, t }: Props) {
  const [title, setTitle] = useState("");
  const [layout, setLayout] = useState<Layout>("carousel");
  const [items, setItems] = useState<Item[]>([{ ...EMPTY_ITEM, images: [] }]);

  useEffect(() => {
    if (!open) return;
    if (initialJson) {
      try {
        const parsed = JSON.parse(initialJson);
        setTitle(typeof parsed.title === "string" ? parsed.title : "");
        setLayout(
          typeof parsed.layout === "string" && (LAYOUTS as readonly string[]).includes(parsed.layout)
            ? (parsed.layout as Layout)
            : "carousel",
        );
        const next: Item[] = Array.isArray(parsed.items)
          ? parsed.items.map((v: Record<string, unknown>) => ({
              name: typeof v.name === "string" ? v.name : "",
              images: parseImagesField(v),
              price: typeof v.price === "string" ? v.price : "",
              originalPrice: typeof v.originalPrice === "string" ? v.originalPrice : "",
              badge:
                typeof v.badge === "string" && (BADGES as readonly string[]).includes(v.badge)
                  ? (v.badge as Exclude<Badge, "">)
                  : "",
              description: typeof v.description === "string" ? v.description : "",
              ctaLabel: typeof v.ctaLabel === "string" ? v.ctaLabel : "",
              ctaUrl: typeof v.ctaUrl === "string" ? v.ctaUrl : "",
            }))
          : [];
        setItems(next.length > 0 ? next : [{ ...EMPTY_ITEM, images: [] }]);
        return;
      } catch {
        /* fall through */
      }
    }
    setTitle("");
    setLayout("carousel");
    setItems([{ ...EMPTY_ITEM, images: [] }]);
  }, [open, initialJson]);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) =>
      prev.length >= MAX_ITEMS ? prev : [...prev, { ...EMPTY_ITEM, images: [] }],
    );
  }

  function removeItem(idx: number) {
    setItems((prev) =>
      prev.length === 1 ? [{ ...EMPTY_ITEM, images: [] }] : prev.filter((_, i) => i !== idx),
    );
  }

  const cleanedItems = items
    .map((it) => ({
      name: it.name.trim(),
      images: it.images.filter((img) => img.url.trim().length > 0),
      price: it.price.trim() || null,
      originalPrice: it.originalPrice.trim() || null,
      badge: it.badge || null,
      description: it.description.trim() || null,
      ctaLabel: it.ctaLabel.trim() || null,
      ctaUrl: it.ctaUrl.trim() || null,
    }))
    .filter((it) => it.name.length > 0);

  const canSave = cleanedItems.length > 0;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialJson ? t("editProductCardTitle") : t("addProductCardTitle")}
      description={t("addProductCardDescription", { max: MAX_ITEMS })}
      confirmLabel={t("save")}
      confirmDisabled={!canSave}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        await onSubmit(
          JSON.stringify({
            title: title.trim() || null,
            layout,
            items: cleanedItems,
          }),
        );
      }}
    >
      <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        <PreviewPane title={title} items={items} t={t} />

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">
            {t("productCardFieldBlockTitle")}
          </span>
          <Input
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("productCardFieldBlockTitlePlaceholder")}
          />
        </label>

        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-700">{t("productCardFieldLayout")}</p>
          <div className="flex flex-wrap gap-1.5">
            {LAYOUTS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLayout(l)}
                aria-pressed={layout === l}
                className={
                  "rounded-full border px-3 py-1 text-[11px] font-medium transition " +
                  (layout === l
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300")
                }
              >
                {t(`productCardLayout_${l}`)}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400">
            {layout === "grid"
              ? t("productCardLayoutGridHint")
              : t("productCardLayoutCarouselHint")}
          </p>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="space-y-2 rounded-md border border-slate-200 bg-slate-50/50 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  {t("productCardItemLabel", { idx: idx + 1 })}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  aria-label={t("remove")}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <FormField label={t("productCardFieldName")} required>
                  <Input
                    value={item.name}
                    maxLength={60}
                    placeholder={t("productCardFieldNamePlaceholder")}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                  />
                </FormField>
                <FormField label={t("productCardFieldPrice")}>
                  <Input
                    value={item.price}
                    maxLength={30}
                    placeholder={t("productCardFieldPricePlaceholder")}
                    onChange={(e) => updateItem(idx, { price: e.target.value })}
                  />
                </FormField>
                <FormField label={t("productCardFieldOriginalPrice")}>
                  <Input
                    value={item.originalPrice}
                    maxLength={30}
                    placeholder={t("productCardFieldOriginalPricePlaceholder")}
                    onChange={(e) => updateItem(idx, { originalPrice: e.target.value })}
                  />
                </FormField>
                <FormField
                  label={t("productCardFieldBadge")}
                  className="sm:col-span-2"
                >
                  <BadgeSelector
                    value={item.badge}
                    onChange={(badge) => updateItem(idx, { badge })}
                    t={t}
                  />
                </FormField>
                <FormField
                  label={t("productCardFieldImages", { max: MAX_IMAGES_PER_ITEM })}
                  className="sm:col-span-2"
                >
                  <ImageGalleryEditor
                    images={item.images}
                    onChange={(images) => updateItem(idx, { images })}
                    t={t}
                  />
                </FormField>
                <FormField label={t("productCardFieldDescription")} className="sm:col-span-2">
                  <Input
                    value={item.description}
                    maxLength={200}
                    placeholder={t("productCardFieldDescriptionPlaceholder")}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                  />
                </FormField>
                <FormField label={t("productCardFieldCtaLabel")}>
                  <Input
                    value={item.ctaLabel}
                    maxLength={30}
                    placeholder={t("productCardFieldCtaLabelPlaceholder")}
                    onChange={(e) => updateItem(idx, { ctaLabel: e.target.value })}
                  />
                </FormField>
                <FormField label={t("productCardFieldCtaUrl")}>
                  <Input
                    type="url"
                    value={item.ctaUrl}
                    maxLength={512}
                    placeholder="https://pf.kakao.com/_..."
                    onChange={(e) => updateItem(idx, { ctaUrl: e.target.value })}
                  />
                </FormField>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          disabled={items.length >= MAX_ITEMS}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("productCardAddItem")}
          <span className="text-[10px] text-slate-400">
            ({items.length}/{MAX_ITEMS})
          </span>
        </button>
      </div>
    </ConfirmDialog>
  );
}

/**
 * Row of pills — one per badge id plus a "none" pill at the start. Same visual shape as the
 * preview chip the public card will render so the seller sees the actual treatment they're
 * picking. Single-select; tapping the current selection clears it (toggle).
 */
function BadgeSelector({
  value,
  onChange,
  t,
}: {
  value: Badge;
  onChange: (badge: Badge) => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  const publicT = useTranslations("publicProfile.productCard.badge");
  const colorByBadge: Record<Exclude<Badge, "">, string> = {
    NEW: "bg-sky-500 text-white",
    BEST: "bg-amber-500 text-white",
    LIMITED: "bg-red-500 text-white",
    SOLD_OUT: "bg-slate-700 text-white",
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange("")}
        aria-pressed={value === ""}
        className={
          "rounded-full border px-3 py-1 text-[11px] font-medium transition " +
          (value === ""
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300")
        }
      >
        {t("productCardBadgeNone")}
      </button>
      {BADGES.map((badge) => {
        const active = value === badge;
        return (
          <button
            key={badge}
            type="button"
            onClick={() => onChange(active ? "" : badge)}
            aria-pressed={active}
            className={
              "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition " +
              (active
                ? "border-transparent " + colorByBadge[badge]
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300")
            }
          >
            {publicT(badge)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact mini-carousel that mirrors how each item will render on the public page — first image
 * with focal point applied, plus name and price. Updates live as the seller edits below, so they
 * can see exactly how their focal-point drag affects the cropped frame they'll ship.
 */
function PreviewPane({
  title,
  items,
  t,
}: {
  title: string;
  items: Item[];
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  const visibleItems = useMemo(
    () => items.filter((it) => it.name.trim().length > 0),
    [items],
  );
  if (visibleItems.length === 0) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="mb-2 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {t("productCardPreviewLabel")}
      </p>
      {title.trim().length > 0 && (
        <p className="mb-2 px-0.5 text-[12px] font-semibold text-slate-900">{title.trim()}</p>
      )}
      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visibleItems.map((item, idx) => {
          const hero = item.images[0];
          return (
            <div
              key={idx}
              className="w-[140px] shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                {hero ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hero.url}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ objectPosition: `${hero.focalX}% ${hero.focalY}%` }}
                  />
                ) : null}
              </div>
              <div className="space-y-0.5 px-2 pb-2 pt-1.5">
                <p className="truncate text-[11px] font-semibold text-slate-900">{item.name}</p>
                {item.price.trim() && (
                  <p className="truncate text-[10px] font-medium text-accent-700">
                    {item.price.trim()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Per-item image gallery: thumbnails laid out horizontally, each with a draggable focal-point dot
 * and reorder / delete affordances. Trailing slot is an empty uploader until the per-item cap is
 * reached. The list owns its own state shape (ProductCardImage[]); persistence happens via the
 * onChange callback so the parent dialog keeps its single source of truth for the items array.
 */
function ImageGalleryEditor({
  images,
  onChange,
  t,
}: {
  images: ProductCardImage[];
  onChange: (next: ProductCardImage[]) => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const uploadT = useTranslations("settings.profile.imageUploader");
  const fileInput = useRef<HTMLInputElement>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function addImage(image: ProductCardImage) {
    if (images.length >= MAX_IMAGES_PER_ITEM) return;
    onChange([...images, image]);
  }

  function removeImage(idx: number) {
    onChange(images.filter((_, i) => i !== idx));
  }

  function moveImage(idx: number, direction: -1 | 1) {
    const swap = idx + direction;
    if (swap < 0 || swap >= images.length) return;
    const next = images.slice();
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  }

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!UPLOAD_ACCEPT.split(",").includes(file.type)) {
      toast(uploadT("invalidType"), "error");
      return;
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      toast(uploadT("tooBig"), "error");
      return;
    }
    setPickedFile(file);
  }

  async function handleCropped(cropped: File) {
    setPickedFile(null);
    setBusy(true);
    try {
      const presign = await presignProfileImageUpload(UPLOAD_OUTPUT_TYPE);
      if (cropped.size > presign.maxBytes) {
        toast(uploadT("tooBig"), "error");
        return;
      }
      await uploadAvatarToS3(presign.uploadUrl, cropped, UPLOAD_OUTPUT_TYPE);
      const committed = await commitProfileImageUpload(presign.key);
      // Focal point fields are kept on the data model for backend compat but always 50/50 now —
      // the cropper produced an image that's already framed at the target aspect, so
      // {@code object-position: 50% 50%} on the public card matches exactly what the seller saw.
      addImage({ url: committed.imageUrl, focalX: FOCAL_DEFAULT, focalY: FOCAL_DEFAULT });
    } catch (err) {
      toast(errorMessage(err, uploadT("uploadFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {images.map((image, idx) => (
          <ImageThumbEditor
            key={idx}
            image={image}
            idx={idx}
            total={images.length}
            onRemove={() => removeImage(idx)}
            onMove={(direction) => moveImage(idx, direction)}
            t={t}
          />
        ))}
        {images.length < MAX_IMAGES_PER_ITEM && (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="flex aspect-[4/3] w-32 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 bg-slate-50/50 text-slate-500 transition hover:border-slate-400 hover:text-slate-700 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-4 w-4" />
                <span className="text-[11px]">
                  {images.length === 0
                    ? t("productCardImagesEmpty")
                    : t("productCardImageAdd")}
                </span>
              </>
            )}
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept={UPLOAD_ACCEPT}
          onChange={handlePick}
          className="hidden"
        />
      </div>
      <p className="text-[10px] leading-snug text-slate-500">
        {t("productCardImageSizeHint")}
      </p>
      <ImageCropperDialog
        open={pickedFile !== null}
        file={pickedFile}
        aspect={4 / 3}
        cropShape="rect"
        outputMaxDim={UPLOAD_MAX_DIM}
        outputType={UPLOAD_OUTPUT_TYPE}
        outputQuality={UPLOAD_QUALITY}
        onCancel={() => setPickedFile(null)}
        onConfirm={handleCropped}
      />
    </div>
  );
}

/**
 * Single thumbnail showing the uploaded image at the public-card aspect (4:3 cover). Focal point
 * editing was removed when the upload flow moved to {@link ImageCropperDialog} — the cropper now
 * produces an image already framed at this aspect, so {@code object-cover} with center origin is
 * the WYSIWYG outcome. Reorder + remove controls stay so the seller can curate the carousel.
 */
function ImageThumbEditor({
  image,
  idx,
  total,
  onRemove,
  onMove,
  t,
}: {
  image: ProductCardImage;
  idx: number;
  total: number;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  return (
    <div className="w-32 shrink-0 space-y-1">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt=""
          draggable={false}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("remove")}
          className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white opacity-80 transition hover:bg-red-600 hover:opacity-100"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={idx === 0}
          aria-label={t("productCardImageMoveLeft")}
          className="grid h-5 w-5 place-items-center rounded text-slate-400 transition hover:text-slate-700 disabled:opacity-30"
        >
          <ArrowLeft className="h-3 w-3" />
        </button>
        <span className="text-[10px] text-slate-400">
          {idx + 1}/{total}
        </span>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={idx === total - 1}
          aria-label={t("productCardImageMoveRight")}
          className="grid h-5 w-5 place-items-center rounded text-slate-400 transition hover:text-slate-700 disabled:opacity-30"
        >
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function clamp(v: number) {
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

/**
 * Parses the {@code images} array out of a stored item, accepting either the new shape (array of
 * {url, focalX, focalY}) or the legacy single {@code image: string} field. Legacy single images
 * are wrapped into a one-element images array with default focal point — same logic the backend
 * runs on read, so the editor's view of a saved block matches what gets persisted.
 */
function parseImagesField(item: Record<string, unknown>): ProductCardImage[] {
  if (Array.isArray(item.images)) {
    return item.images
      .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
      .map((v) => ({
        url: typeof v.url === "string" ? v.url : "",
        focalX: typeof v.focalX === "number" ? clamp(v.focalX) : FOCAL_DEFAULT,
        focalY: typeof v.focalY === "number" ? clamp(v.focalY) : FOCAL_DEFAULT,
      }))
      .filter((img) => img.url.length > 0);
  }
  if (typeof item.image === "string" && item.image.length > 0) {
    return [{ url: item.image, focalX: FOCAL_DEFAULT, focalY: FOCAL_DEFAULT }];
  }
  return [];
}

