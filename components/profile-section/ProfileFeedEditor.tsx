"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ImageIcon,
  Minus,
  Pencil,
  Plus,
  Star,
  Type,
  X,
} from "lucide-react";
import type { useTranslations } from "next-intl";
import type { MyLink } from "@/types";
import type { FeedItem } from "./types";

type Props = {
  items: FeedItem[];
  links: MyLink[] | null;
  highlightedShortCode: string | null;
  pendingShortCode: string | null;
  dragIndex: number | null;
  overIndex: number | null;
  onAddText: () => void;
  onAddDivider: () => void;
  onAddImage: () => void;
  onMove: (idx: number, direction: -1 | 1) => void;
  onDragStart: (idx: number, e: React.DragEvent) => void;
  onDragOver: (idx: number, e: React.DragEvent) => void;
  onDragLeave: (idx: number) => void;
  onDrop: (idx: number, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onHighlight: (shortCode: string) => void;
  onToggle: (shortCode: string, show: boolean) => void;
  onEditBlock: (blockId: number, current: string) => void;
  onDeleteBlock: (blockId: number) => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * The middle panel of the profile editor: ordered list of feed items (mix of links + text/divider/
 * image blocks), three "+ block" buttons up top, and a collapsed list of unfeatured links at the
 * bottom for quick toggling. Drag-and-drop state is owned by the parent; this component is pure
 * dispatch.
 */
export function ProfileFeedEditor({
  items,
  links,
  highlightedShortCode,
  pendingShortCode,
  dragIndex,
  overIndex,
  onAddText,
  onAddDivider,
  onAddImage,
  onMove,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onHighlight,
  onToggle,
  onEditBlock,
  onDeleteBlock,
  t,
}: Props) {
  const featuredCodes = items
    .filter((i): i is { kind: "LINK"; code: string } => i.kind === "LINK")
    .map((i) => i.code);
  const otherLinks = (links ?? []).filter((l) => !featuredCodes.includes(l.shortCode));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-700">{t("featuredTitle")}</p>
          <p className="text-[11px] text-slate-500">{t("featuredHint")}</p>
        </div>
        <AddMenu
          onAddText={onAddText}
          onAddDivider={onAddDivider}
          onAddImage={onAddImage}
          t={t}
        />
      </div>

      {links === null ? (
        <p className="text-xs text-slate-400">{t("loading")}</p>
      ) : (
        <>
          {items.length === 0 ? (
            <FeedEmptyState
              hasOtherLinks={otherLinks.length > 0}
              otherCount={otherLinks.length}
              t={t}
            />
          ) : (
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
              {items.map((item, idx) => (
                <FeedItemRow
                  key={item.kind === "LINK" ? `link:${item.code}` : `block:${item.id}`}
                  item={item}
                  idx={idx}
                  totalCount={items.length}
                  links={links}
                  highlightedShortCode={highlightedShortCode}
                  pendingShortCode={pendingShortCode}
                  isDragging={dragIndex === idx}
                  isOver={overIndex === idx && dragIndex !== null && dragIndex !== idx}
                  onMove={onMove}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onDragEnd={onDragEnd}
                  onHighlight={onHighlight}
                  onToggle={onToggle}
                  onEditBlock={onEditBlock}
                  onDeleteBlock={onDeleteBlock}
                  t={t}
                />
              ))}
            </ul>
          )}

          {otherLinks.length > 0 && (
            // Default-expand for first-timers (no featured items yet) — they often miss the
            // collapsed disclosure and don't realize how to add their existing links to the feed.
            <details className="group" open={items.length === 0}>
              <summary className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-900">
                {t("addMore")} ({otherLinks.length})
              </summary>
              <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
                {otherLinks.map((link) => (
                  <li
                    key={link.shortCode}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm text-slate-900">
                        /{link.shortCode}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">{link.originalUrl}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggle(link.shortCode, true)}
                      disabled={pendingShortCode === link.shortCode}
                      className="text-[11px] text-accent-700 hover:text-accent-800"
                    >
                      {t("add")}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Single "+" button that opens a small menu of block kinds. Replaces the row of three separate
 * "+ 헤더 / + 구분선 / + 이미지" pills — same affordance, less visual noise. Closes on outside
 * click or Escape so it doesn't trap focus.
 */
function AddMenu({
  onAddText,
  onAddDivider,
  onAddImage,
  t,
}: {
  onAddText: () => void;
  onAddDivider: () => void;
  onAddImage: () => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function fire(handler: () => void) {
    setOpen(false);
    handler();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("addBlockMenu")}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <MenuItem onClick={() => fire(onAddText)} icon={<Type className="h-3.5 w-3.5" />}>
            {t("addHeader")}
          </MenuItem>
          <MenuItem onClick={() => fire(onAddDivider)} icon={<Minus className="h-3.5 w-3.5" />}>
            {t("addDivider")}
          </MenuItem>
          <MenuItem onClick={() => fire(onAddImage)} icon={<ImageIcon className="h-3.5 w-3.5" />}>
            {t("addImage")}
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * Empty-feed state with an arrow pointing toward the existing "Add link" form above. When the
 * user has unfeatured links, surfaces the count + a hint that the disclosure below is the way
 * to add them — clearer than the previous one-line dashed box.
 */
function FeedEmptyState({
  hasOtherLinks,
  otherCount,
  t,
}: {
  hasOtherLinks: boolean;
  otherCount: number;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-4 py-8 text-center">
      <ArrowUp className="mx-auto h-4 w-4 text-slate-400" />
      <p className="mt-2 text-sm font-medium text-slate-700">{t("featuredEmptyTitle")}</p>
      <p className="mt-1 text-[11px] text-slate-500">
        {hasOtherLinks
          ? t("featuredEmptyHasOthers", { count: otherCount })
          : t("featuredEmpty")}
      </p>
    </div>
  );
}

type RowProps = {
  item: FeedItem;
  idx: number;
  totalCount: number;
  links: MyLink[];
  highlightedShortCode: string | null;
  pendingShortCode: string | null;
  isDragging: boolean;
  isOver: boolean;
  onMove: (idx: number, direction: -1 | 1) => void;
  onDragStart: (idx: number, e: React.DragEvent) => void;
  onDragOver: (idx: number, e: React.DragEvent) => void;
  onDragLeave: (idx: number) => void;
  onDrop: (idx: number, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onHighlight: (shortCode: string) => void;
  onToggle: (shortCode: string, show: boolean) => void;
  onEditBlock: (blockId: number, current: string) => void;
  onDeleteBlock: (blockId: number) => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

function FeedItemRow({
  item,
  idx,
  totalCount,
  links,
  highlightedShortCode,
  pendingShortCode,
  isDragging,
  isOver,
  onMove,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onHighlight,
  onToggle,
  onEditBlock,
  onDeleteBlock,
  t,
}: RowProps) {
  const dndProps = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => onDragStart(idx, e),
    onDragOver: (e: React.DragEvent) => onDragOver(idx, e),
    onDragLeave: () => onDragLeave(idx),
    onDrop: (e: React.DragEvent) => onDrop(idx, e),
    onDragEnd,
  };
  const baseRow =
    "flex items-center justify-between gap-3 px-3 py-2 transition " +
    (isDragging ? "opacity-40 " : "") +
    (isOver ? "border-t-2 border-t-accent-500 " : "");
  const dragHandle = <DragHandle idx={idx} totalCount={totalCount} onMove={onMove} />;

  if (item.kind === "BLOCK" && item.type === "DIVIDER") {
    // Slim row — a divider on the public profile is a thin horizontal rule, so the editor row
    // shouldn't pretend it's a heavy item. Compact padding + a centered hr communicates that.
    const slimRow =
      "flex items-center gap-2 px-3 py-1 transition " +
      (isDragging ? "opacity-40 " : "") +
      (isOver ? "border-t-2 border-t-accent-500 " : "");
    return (
      <li {...dndProps} className={slimRow}>
        {dragHandle}
        <hr className="flex-1 border-t border-slate-300" aria-label={t("dividerLabel")} />
        <button
          type="button"
          onClick={() => onDeleteBlock(item.id)}
          className="text-slate-300 hover:text-red-600"
          aria-label={t("remove")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </li>
    );
  }
  if (item.kind === "BLOCK" && item.type === "IMAGE") {
    return (
      <li {...dndProps} className={baseRow}>
        {dragHandle}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {item.content ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.content}
              alt=""
              className="h-10 w-10 shrink-0 rounded object-cover"
            />
          ) : (
            <ImageIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          )}
          <span className="truncate text-[11px] text-slate-500">
            {item.content || t("addImagePlaceholder")}
          </span>
        </div>
        <BlockActions
          onEdit={() => onEditBlock(item.id, item.content ?? "")}
          onDelete={() => onDeleteBlock(item.id)}
          t={t}
        />
      </li>
    );
  }
  if (item.kind === "BLOCK" && item.type === "TEXT") {
    return (
      <li {...dndProps} className={baseRow}>
        {dragHandle}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Type className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate text-sm font-semibold text-slate-900">
            {item.content || t("addTextPlaceholder")}
          </span>
        </div>
        <BlockActions
          onEdit={() => onEditBlock(item.id, item.content ?? "")}
          onDelete={() => onDeleteBlock(item.id)}
          t={t}
        />
      </li>
    );
  }
  // LINK row
  if (item.kind !== "LINK") return null;
  const link = links.find((l) => l.shortCode === item.code);
  if (!link) return null;
  const highlighted = highlightedShortCode === link.shortCode;
  return (
    <li {...dndProps} className={baseRow}>
      {dragHandle}
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm text-slate-900">/{link.shortCode}</p>
        <p className="truncate text-[11px] text-slate-500">{link.originalUrl}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onHighlight(link.shortCode)}
          aria-pressed={highlighted}
          title={t("highlight")}
          className={
            "transition " +
            (highlighted ? "text-amber-500" : "text-slate-300 hover:text-slate-700")
          }
        >
          <Star className="h-3.5 w-3.5" fill={highlighted ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          onClick={() => onToggle(link.shortCode, false)}
          disabled={pendingShortCode === link.shortCode}
          className="text-[11px] text-slate-500 hover:text-red-600"
        >
          {t("remove")}
        </button>
      </div>
    </li>
  );
}

function DragHandle({
  idx,
  totalCount,
  onMove,
}: {
  idx: number;
  totalCount: number;
  onMove: (idx: number, direction: -1 | 1) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        aria-label="drag handle"
        className="cursor-grab touch-none text-slate-300 hover:text-slate-700 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </span>
      {/* Up/down buttons stay as keyboard / a11y / mobile fallback. */}
      <div className="flex flex-col sm:hidden">
        <button
          type="button"
          aria-label="up"
          disabled={idx === 0}
          onClick={() => onMove(idx, -1)}
          className="text-slate-400 hover:text-slate-900 disabled:opacity-30"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="down"
          disabled={idx === totalCount - 1}
          onClick={() => onMove(idx, 1)}
          className="text-slate-400 hover:text-slate-900 disabled:opacity-30"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function BlockActions({
  onEdit,
  onDelete,
  t,
}: {
  onEdit: () => void;
  onDelete: () => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="text-slate-400 hover:text-slate-900"
        aria-label={t("editTextAction")}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="text-slate-400 hover:text-red-600"
        aria-label={t("remove")}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
