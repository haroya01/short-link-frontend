"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Contact,
  GalleryHorizontal,
  GripVertical,
  ImageIcon,
  Mail,
  MapPin,
  Minus,
  MinusCircle,
  Pencil,
  Play,
  ShoppingBag,
  Star,
  Trash2,
  Type,
} from "lucide-react";
import { useLocale, type useTranslations } from "next-intl";
import type { MyLink } from "@/types";
import { ActionMenu, type ActionMenuItem } from "@/components/common/action-menu";
import { useDismiss } from "@/hooks/use-dismiss";
import { useMenuKeys } from "@/hooks/use-menu-keys";
import { summarizeTextBody } from "@/modules/profile/lib/feed-summarizers";
import type { FeedItem } from "@/modules/profile/curation/types";
import { BLOCK_ROW_META, isCommonBlockType } from "@/modules/profile/curation/block-row-meta";

type Props = {
  items: FeedItem[];
  links: MyLink[] | null;
  highlightedShortCode: string | null;
  highlightedBlockId: number | null;
  pendingShortCode: string | null;
  /** Current label (OG title override) per short code — what visitors see on the public profile. */
  labelByShortCode: Record<string, string>;
  dragIndex: number | null;
  overIndex: number | null;
  onAddText: () => void;
  onAddDivider: () => void;
  onAddImage: () => void;
  onAddEmbed: () => void;
  onAddContactCard: () => void;
  onAddGallery: () => void;
  onAddProductCard: () => void;
  onAddEmailForm: () => void;
  onAddBooking: () => void;
  onAddEvent: () => void;
  onAddPlace: () => void;
  onMove: (idx: number, direction: -1 | 1) => void;
  onDragStart: (idx: number, e: React.DragEvent) => void;
  onDragOver: (idx: number, e: React.DragEvent) => void;
  onDrop: (idx: number, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onHighlight: (shortCode: string) => void;
  onHighlightBlock: (blockId: number) => void;
  onToggle: (shortCode: string, show: boolean) => void;
  onEditBlock: (blockId: number, current: string) => void;
  onDeleteBlock: (blockId: number) => void;
  /** Save the visible label (== OG title override). Pass empty string to clear back to host fallback. */
  onEditLabel: (shortCode: string, label: string) => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

const OTHER_LINKS_PREVIEW = 5;

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
  highlightedBlockId,
  pendingShortCode,
  labelByShortCode,
  dragIndex,
  overIndex,
  onAddText,
  onAddDivider,
  onAddImage,
  onAddEmbed,
  onAddContactCard,
  onAddGallery,
  onAddProductCard,
  onAddEmailForm,
  onAddBooking,
  onAddEvent,
  onAddPlace,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onHighlight,
  onHighlightBlock,
  onToggle,
  onEditBlock,
  onDeleteBlock,
  onEditLabel,
  t,
}: Props) {
  const featuredCodes = items
    .filter((i): i is { kind: "LINK"; code: string } => i.kind === "LINK")
    .map((i) => i.code);
  const otherLinks = (links ?? []).filter((l) => !featuredCodes.includes(l.shortCode));
  const [showAllOthers, setShowAllOthers] = useState(false);
  const shownOthers = showAllOthers ? otherLinks : otherLinks.slice(0, OTHER_LINKS_PREVIEW);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{t("featuredTitle")}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("featuredHint")}</p>
        </div>
        <AddMenu
          onAddText={onAddText}
          onAddDivider={onAddDivider}
          onAddImage={onAddImage}
          onAddEmbed={onAddEmbed}
          onAddContactCard={onAddContactCard}
          onAddGallery={onAddGallery}
          onAddProductCard={onAddProductCard}
          onAddEmailForm={onAddEmailForm}
          onAddBooking={onAddBooking}
          onAddEvent={onAddEvent}
          onAddPlace={onAddPlace}
          t={t}
        />
      </div>

      {links === null ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("loading")}</p>
      ) : (
        <>
          {items.length === 0 ? (
            <FeedEmptyState
              hasOtherLinks={otherLinks.length > 0}
              otherCount={otherLinks.length}
              t={t}
            />
          ) : (
            <FeedItemList
              items={items}
              links={links}
              highlightedShortCode={highlightedShortCode}
              highlightedBlockId={highlightedBlockId}
              pendingShortCode={pendingShortCode}
              labelByShortCode={labelByShortCode}
              dragIndex={dragIndex}
              overIndex={overIndex}
              onMove={onMove}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onHighlight={onHighlight}
              onHighlightBlock={onHighlightBlock}
              onToggle={onToggle}
              onEditBlock={onEditBlock}
              onDeleteBlock={onDeleteBlock}
              onEditLabel={onEditLabel}
              t={t}
            />
          )}

          {otherLinks.length > 0 && (
            // Default-expand for first-timers (no featured items yet) — they often miss the
            // collapsed disclosure and don't realize how to add their existing links to the feed.
            <details className="group" open={items.length === 0}>
              <summary className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                {t("addMore")} ({otherLinks.length})
              </summary>
              <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 dark:divide-slate-800">
                {shownOthers.map((link) => (
                  <li
                    key={link.shortCode}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <LinkLabelField
                        shortCode={link.shortCode}
                        currentLabel={labelByShortCode[link.shortCode] ?? ""}
                        onSave={onEditLabel}
                        t={t}
                      />
                      <p className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        /{link.shortCode} · {link.originalUrl}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggle(link.shortCode, true)}
                      disabled={pendingShortCode === link.shortCode}
                      className="touch-target focus-ring shrink-0 rounded-sm text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                    >
                      {t("add")}
                    </button>
                  </li>
                ))}
                {otherLinks.length > shownOthers.length && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setShowAllOthers(true)}
                      className="focus-ring w-full rounded-b-md px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50"
                    >
                      {t("showMoreLinks", { count: otherLinks.length - shownOthers.length })}
                    </button>
                  </li>
                )}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

const MENU_EDGE = 8;

function AddMenu({
  onAddText,
  onAddDivider,
  onAddImage,
  onAddEmbed,
  onAddContactCard,
  onAddGallery,
  onAddProductCard,
  onAddEmailForm,
  onAddBooking,
  onAddEvent,
  onAddPlace,
  t,
}: {
  onAddText: () => void;
  onAddDivider: () => void;
  onAddImage: () => void;
  onAddEmbed: () => void;
  onAddContactCard: () => void;
  onAddGallery: () => void;
  onAddProductCard: () => void;
  onAddEmailForm: () => void;
  onAddBooking: () => void;
  onAddEvent: () => void;
  onAddPlace: () => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useDismiss(open, containerRef, () => setOpen(false));
  const { onKeyDown, focusFirst } = useMenuKeys(menuRef, {
    onClose: (refocus) => {
      setOpen(false);
      if (refocus) triggerRef.current?.focus();
    },
  });

  useLayoutEffect(() => {
    if (!open) {
      setShift(0);
      return;
    }
    const menu = menuRef.current?.getBoundingClientRect();
    const trigger = triggerRef.current?.getBoundingClientRect();
    const column = containerRef.current?.parentElement?.getBoundingClientRect();
    if (!menu || !trigger) return;
    const right = Math.min(window.innerWidth - MENU_EDGE, column?.right ?? Infinity);
    const start = menu.right > right ? trigger.right - menu.width : menu.left;
    const left = Math.max(MENU_EDGE, Math.min(start, right - menu.width));
    setShift(left - menu.left);
  }, [open]);

  useEffect(() => {
    if (open) focusFirst();
  }, [open, focusFirst]);

  function fire(handler: () => void) {
    setOpen(false);
    handler();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700"
      >
        {t("addBlockMenu")}
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={t("addBlockMenu")}
          onKeyDown={onKeyDown}
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
          className="absolute left-0 top-full z-20 mt-1 w-48 rounded-2xl border border-slate-200 bg-white p-1 shadow-float dark:border-slate-700 dark:bg-slate-850"
        >
          <MenuItem onClick={() => fire(onAddText)} icon={<Type className="h-3.5 w-3.5" />}>
            {t("addHeader")}
          </MenuItem>
          <MenuItem onClick={() => fire(onAddImage)} icon={<ImageIcon className="h-3.5 w-3.5" />}>
            {t("addImage")}
          </MenuItem>
          <MenuItem onClick={() => fire(onAddEmbed)} icon={<Play className="h-3.5 w-3.5" />}>
            {t("addEmbed")}
          </MenuItem>
          <div className="mt-1 border-t border-slate-100 px-3 pb-1 pt-2 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {t("addMoreBlocks")}
          </div>
          <MenuItem onClick={() => fire(onAddDivider)} icon={<Minus className="h-3.5 w-3.5" />}>
            {t("addDivider")}
          </MenuItem>
          <MenuItem
            onClick={() => fire(onAddContactCard)}
            icon={<Contact className="h-3.5 w-3.5" />}
          >
            {t("addContactCard")}
          </MenuItem>
          <MenuItem
            onClick={() => fire(onAddGallery)}
            icon={<GalleryHorizontal className="h-3.5 w-3.5" />}
          >
            {t("addGallery")}
          </MenuItem>
          <MenuItem
            onClick={() => fire(onAddProductCard)}
            icon={<ShoppingBag className="h-3.5 w-3.5" />}
          >
            {t("addProductCard")}
          </MenuItem>
          <MenuItem
            onClick={() => fire(onAddEmailForm)}
            icon={<Mail className="h-3.5 w-3.5" />}
          >
            {t("addEmailForm")}
          </MenuItem>
          <MenuItem
            onClick={() => fire(onAddBooking)}
            icon={<CalendarDays className="h-3.5 w-3.5" />}
          >
            {t("addBooking")}
          </MenuItem>
          <MenuItem
            onClick={() => fire(onAddEvent)}
            icon={<CalendarClock className="h-3.5 w-3.5" />}
          >
            {t("addEvent")}
          </MenuItem>
          <MenuItem
            onClick={() => fire(onAddPlace)}
            icon={<MapPin className="h-3.5 w-3.5" />}
          >
            {t("addPlace")}
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
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {icon}
      {children}
    </button>
  );
}

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
    <p className="border-t border-slate-200 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
      {hasOtherLinks ? t("featuredEmptyHasOthers", { count: otherCount }) : t("featuredEmpty")}
    </p>
  );
}

function FeedItemList({
  items,
  links,
  highlightedShortCode,
  highlightedBlockId,
  pendingShortCode,
  labelByShortCode,
  dragIndex,
  overIndex,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onHighlight,
  onHighlightBlock,
  onToggle,
  onEditBlock,
  onDeleteBlock,
  onEditLabel,
  t,
}: {
  items: FeedItem[];
  links: MyLink[];
  highlightedShortCode: string | null;
  highlightedBlockId: number | null;
  pendingShortCode: string | null;
  labelByShortCode: Record<string, string>;
  dragIndex: number | null;
  overIndex: number | null;
  onMove: (idx: number, direction: -1 | 1) => void;
  onDragStart: (idx: number, e: React.DragEvent) => void;
  onDragOver: (idx: number, e: React.DragEvent) => void;
  onDrop: (idx: number, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onHighlight: (shortCode: string) => void;
  onHighlightBlock: (blockId: number) => void;
  onToggle: (shortCode: string, show: boolean) => void;
  onEditBlock: (blockId: number, current: string) => void;
  onDeleteBlock: (blockId: number) => void;
  onEditLabel: (shortCode: string, label: string) => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  return (
    <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 dark:divide-slate-800">
      {items.map((item, idx) => (
        <FeedItemRow
          key={item.kind === "LINK" ? `link:${item.code}` : `block:${item.id}`}
          item={item}
          idx={idx}
          totalCount={items.length}
          links={links}
          highlightedShortCode={highlightedShortCode}
          highlightedBlockId={highlightedBlockId}
          pendingShortCode={pendingShortCode}
          labelByShortCode={labelByShortCode}
          isDragging={dragIndex === idx}
          isOver={overIndex === idx && dragIndex !== null && dragIndex !== idx}
          onMove={onMove}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragEnd={onDragEnd}
          onHighlight={onHighlight}
          onHighlightBlock={onHighlightBlock}
          onToggle={onToggle}
          onEditBlock={onEditBlock}
          onDeleteBlock={onDeleteBlock}
          onEditLabel={onEditLabel}
          t={t}
        />
      ))}
    </ul>
  );
}

type RowProps = {
  item: FeedItem;
  idx: number;
  totalCount: number;
  links: MyLink[];
  highlightedShortCode: string | null;
  highlightedBlockId: number | null;
  pendingShortCode: string | null;
  labelByShortCode: Record<string, string>;
  isDragging: boolean;
  isOver: boolean;
  onMove: (idx: number, direction: -1 | 1) => void;
  onDragStart: (idx: number, e: React.DragEvent) => void;
  onDragOver: (idx: number, e: React.DragEvent) => void;
  onDrop: (idx: number, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onHighlight: (shortCode: string) => void;
  onHighlightBlock: (blockId: number) => void;
  onToggle: (shortCode: string, show: boolean) => void;
  onEditBlock: (blockId: number, current: string) => void;
  onDeleteBlock: (blockId: number) => void;
  onEditLabel: (shortCode: string, label: string) => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

function FeedItemRow({
  item,
  idx,
  totalCount,
  links,
  highlightedShortCode,
  highlightedBlockId,
  pendingShortCode,
  labelByShortCode,
  isDragging,
  isOver,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onHighlight,
  onHighlightBlock,
  onToggle,
  onEditBlock,
  onDeleteBlock,
  onEditLabel,
  t,
}: RowProps) {
  const locale = useLocale();
  const dndProps = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => onDragStart(idx, e),
    onDragOver: (e: React.DragEvent) => onDragOver(idx, e),
    onDrop: (e: React.DragEvent) => onDrop(idx, e),
    onDragEnd,
  };
  // Drop-zone indicator: a thin bar that hovers just above the target row. Positioned absolutely so
  // it takes zero layout space — rows that shifted on dragover flickered at ~60Hz as the cursor
  // crossed child elements.
  const dropIndicator = isOver
    ? "before:pointer-events-none before:absolute before:inset-x-2 before:-top-[2px] before:h-1 before:rounded-full before:bg-slate-900 "
    : "";
  const draggingState = isDragging ? "scale-[0.98] opacity-30 ring-2 ring-slate-300 rounded-md " : "";
  const baseRow =
    "relative flex items-center justify-between gap-3 px-3 py-2 transition-[opacity,transform,box-shadow] duration-150 " +
    draggingState +
    dropIndicator;
  const dragHandle = <DragHandle idx={idx} totalCount={totalCount} onMove={onMove} t={t} />;
  const blockMenu = (featured?: { active: boolean; onToggle: () => void }) => (
    <RowMenu
      t={t}
      items={[
        ...(featured ? [featureItem(t, featured.active, featured.onToggle)] : []),
        ...(item.kind === "BLOCK" && item.type !== "DIVIDER"
          ? [{ label: t("editTextAction"), icon: Pencil, onSelect: () => onEditBlock(item.id, item.content ?? "") }]
          : []),
        ...(item.kind === "BLOCK"
          ? [{ label: t("remove"), icon: Trash2, destructive: true, onSelect: () => onDeleteBlock(item.id) }]
          : []),
      ]}
    />
  );

  if (item.kind === "BLOCK" && item.type === "DIVIDER") {
    return (
      <li {...dndProps} className={baseRow.replace("py-2", "py-1")}>
        {dragHandle}
        <hr className="flex-1 border-t border-slate-300 dark:border-slate-700" aria-label={t("dividerLabel")} />
        {blockMenu()}
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
            <img src={item.content} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
          ) : (
            <ImageIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          )}
          <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {item.content || t("addImagePlaceholder")}
          </span>
        </div>
        {blockMenu()}
      </li>
    );
  }
  if (item.kind === "BLOCK" && (isCommonBlockType(item.type) || item.type === "TEXT")) {
    const meta = item.type === "TEXT" ? null : BLOCK_ROW_META[item.type];
    const Icon = meta ? meta.Icon : Type;
    const text = meta
      ? meta.render(item.content, t, locale) || t(meta.placeholderKey)
      : summarizeTextBody(item.content) || t("addTextPlaceholder");
    const textClass =
      !meta || meta.textStyle === "primary"
        ? "truncate text-sm font-medium text-slate-900 dark:text-slate-100"
        : "truncate text-[11px] text-slate-500 dark:text-slate-400";
    const featurable = item.type === "EVENT" || item.type === "PRODUCT_CARD";
    const featured = featurable && highlightedBlockId === item.id;
    return (
      <li {...dndProps} className={baseRow}>
        {dragHandle}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className={textClass}>{text}</span>
          {featured ? <FeaturedMark t={t} /> : null}
        </div>
        {blockMenu(featurable ? { active: featured, onToggle: () => onHighlightBlock(item.id) } : undefined)}
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
        <div className="flex min-w-0 items-center gap-2">
          <LinkLabelField
            shortCode={link.shortCode}
            currentLabel={labelByShortCode[link.shortCode] ?? ""}
            onSave={onEditLabel}
            t={t}
          />
          {highlighted ? <FeaturedMark t={t} /> : null}
        </div>
        <p className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
          /{link.shortCode} · {link.originalUrl}
        </p>
      </div>
      <RowMenu
        t={t}
        items={[
          featureItem(t, highlighted, () => onHighlight(link.shortCode)),
          {
            label: t("removeLink"),
            icon: MinusCircle,
            destructive: true,
            disabled: pendingShortCode === link.shortCode,
            onSelect: () => onToggle(link.shortCode, false),
          },
        ]}
      />
    </li>
  );
}

/**
 * Click-to-edit field for the visible label on the public profile. Empty saves clear the override
 * (falls back to the host on the public page). Esc cancels, Enter / blur commits — same shape as
 * the bio input above, so muscle memory transfers.
 */
function LinkLabelField({
  shortCode,
  currentLabel,
  onSave,
  t,
}: {
  shortCode: string;
  currentLabel: string;
  onSave: (shortCode: string, label: string) => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentLabel);

  function commit() {
    setEditing(false);
    if (draft === currentLabel) return;
    onSave(shortCode, draft.trim());
  }

  if (editing) {
    return (
      <input
        type="text"
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setDraft(currentLabel);
            setEditing(false);
          }
        }}
        maxLength={120}
        placeholder={t("labelPlaceholder")}
        className="block w-full truncate border-b border-slate-900 bg-transparent text-sm font-medium text-slate-900 outline-none dark:border-slate-600 dark:text-slate-100"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(currentLabel);
        setEditing(true);
      }}
      title={t("labelEdit")}
      className={
        "group inline-flex max-w-full items-center gap-1.5 rounded text-left text-sm font-medium transition " +
        (currentLabel
          ? "text-slate-900 hover:text-slate-600 dark:text-slate-100 dark:hover:text-slate-300"
          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100")
      }
    >
      <span className="truncate underline decoration-dotted decoration-slate-300 underline-offset-2 group-hover:decoration-slate-500 dark:decoration-slate-600">
        {currentLabel || t("labelEmpty")}
      </span>
      <Pencil className="h-3 w-3 shrink-0 text-slate-400 transition group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" />
    </button>
  );
}

function DragHandle({
  idx,
  totalCount,
  onMove,
  t,
}: {
  idx: number;
  totalCount: number;
  onMove: (idx: number, direction: -1 | 1) => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        aria-label="drag handle"
        className="hidden cursor-grab touch-none text-slate-300 hover:text-slate-700 active:cursor-grabbing dark:hover:text-slate-200 sm:inline"
      >
        <GripVertical className="h-4 w-4" />
      </span>
      {/* Up/down buttons stay as keyboard / a11y / mobile fallback. */}
      <div className="flex flex-col sm:hidden">
        <button
          type="button"
          aria-label={t("moveUp")}
          disabled={idx === 0}
          onClick={() => onMove(idx, -1)}
          className="grid h-[22px] w-8 place-items-center text-slate-400 hover:text-slate-900 disabled:opacity-30 dark:hover:text-slate-200"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label={t("moveDown")}
          disabled={idx === totalCount - 1}
          onClick={() => onMove(idx, 1)}
          className="grid h-[22px] w-8 place-items-center text-slate-400 hover:text-slate-900 disabled:opacity-30 dark:hover:text-slate-200"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function featureItem(
  t: ReturnType<typeof useTranslations<"settings.profile">>,
  active: boolean,
  onToggle: () => void,
): ActionMenuItem {
  return { label: t("highlight"), icon: Star, checked: active, onSelect: onToggle };
}

function FeaturedMark({ t }: { t: ReturnType<typeof useTranslations<"settings.profile">> }) {
  return <span className="shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">{t("featuredMark")}</span>;
}

function RowMenu({
  items,
  t,
}: {
  items: ActionMenuItem[];
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  return <ActionMenu label={t("rowActions")} items={items} triggerClassName="h-11 w-11 shrink-0 text-slate-500 dark:text-slate-400" />;
}
