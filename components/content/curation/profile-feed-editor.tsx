"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Contact,
  GalleryHorizontal,
  GripVertical,
  ImageIcon,
  Mail,
  MapPin,
  Minus,
  Pencil,
  Play,
  Plus,
  ShoppingBag,
  Star,
  Type,
  X,
} from "lucide-react";
import type { useTranslations } from "next-intl";
import type { MyLink } from "@/types";
import { useCollapsedSections } from "@/hooks/use-collapsed-sections";
import { summarizeTextBody } from "@/lib/feed-summarizers";
import type { FeedItem } from "@/components/content/curation/types";
import { BLOCK_ROW_META, isCommonBlockType } from "@/components/content/curation/block-row-meta";

type SectionMeta = {
  /** Index of the TEXT header that anchors this section, or null when the row sits above the
   *  first header (the "ungrouped prefix"). */
  headerIdx: number | null;
  /** profile_block id of the section header — the stable key used in localStorage so a header
   *  stays collapsed across reorders that change its array position. */
  headerId: number | null;
  /** Items in this section excluding the header itself. Shown as "3 items" on the header chip. */
  count: number;
};

/**
 * Walks the flat feed once and returns, per row, which TEXT header it belongs to plus the
 * section's body count. The returned array is index-aligned with {@code items}, so callers can do
 * {@code sectionByIdx[idx]} during a render loop without re-scanning the array per row.
 */
function computeSectionMeta(items: FeedItem[]): SectionMeta[] {
  const meta: { headerIdx: number | null; headerId: number | null }[] = [];
  let currentIdx: number | null = null;
  let currentId: number | null = null;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind === "BLOCK" && it.type === "TEXT") {
      currentIdx = i;
      currentId = it.id;
    }
    meta.push({ headerIdx: currentIdx, headerId: currentId });
  }
  const counts = new Map<number, number>();
  for (const m of meta) {
    if (m.headerIdx !== null) counts.set(m.headerIdx, (counts.get(m.headerIdx) ?? 0) + 1);
  }
  return meta.map((m) => ({
    headerIdx: m.headerIdx,
    headerId: m.headerId,
    // Subtract 1 because the count includes the header row itself.
    count: m.headerIdx !== null ? (counts.get(m.headerIdx) ?? 1) - 1 : 0,
  }));
}

type Props = {
  items: FeedItem[];
  links: MyLink[] | null;
  highlightedShortCode: string | null;
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
  onToggle: (shortCode: string, show: boolean) => void;
  onEditBlock: (blockId: number, current: string) => void;
  onDeleteBlock: (blockId: number) => void;
  /** Save the visible label (== OG title override). Pass empty string to clear back to host fallback. */
  onEditLabel: (shortCode: string, label: string) => void;
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
            <FeedItemList
              items={items}
              links={links}
              highlightedShortCode={highlightedShortCode}
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
                      <LinkLabelField
                        shortCode={link.shortCode}
                        currentLabel={labelByShortCode[link.shortCode] ?? ""}
                        onSave={onEditLabel}
                        t={t}
                      />
                      <p className="truncate font-mono text-[11px] text-slate-400">
                        /{link.shortCode} · {link.originalUrl}
                      </p>
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
        // Two-group menu: the three blocks most users reach for first (Header / Image / Embed)
        // sit on top so the menu doesn't read as an 11-item paralysis grid. The other eight
        // are tucked below a small "More blocks" separator — still one tap away, but visually
        // demoted.
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
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
          <div className="border-t border-slate-100 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
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

/**
 * Section-aware wrapper around the flat item list. Computes which TEXT header anchors each row,
 * hides rows inside a collapsed section (everything except the header itself), and renders a
 * thin accent-color left rail on indented rows so the visual grouping is obvious without an
 * extra wrapper element that would have broken the existing drag-and-drop flat-index contract.
 */
function FeedItemList({
  items,
  links,
  highlightedShortCode,
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
  onToggle,
  onEditBlock,
  onDeleteBlock,
  onEditLabel,
  t,
}: {
  items: FeedItem[];
  links: MyLink[];
  highlightedShortCode: string | null;
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
  onToggle: (shortCode: string, show: boolean) => void;
  onEditBlock: (blockId: number, current: string) => void;
  onDeleteBlock: (blockId: number) => void;
  onEditLabel: (shortCode: string, label: string) => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  const { collapsed, toggle } = useCollapsedSections();
  const sectionByIdx = useMemo(() => computeSectionMeta(items), [items]);

  return (
    <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
      {items.map((item, idx) => {
        const meta = sectionByIdx[idx];
        const isHeader = item.kind === "BLOCK" && item.type === "TEXT";
        const sectionId = meta.headerId;
        const isCollapsed = sectionId != null && collapsed.has(sectionId);
        // Hide non-header rows that live inside a collapsed section. The header itself always
        // renders so the user can still toggle it back open.
        if (isCollapsed && !isHeader) return null;
        const sectionInfo =
          isHeader && sectionId != null
            ? {
                collapsed: collapsed.has(sectionId),
                count: meta.count,
                onToggle: () => toggle(sectionId),
              }
            : null;
        const indented = !isHeader && meta.headerId != null;
        return (
          <FeedItemRow
            key={item.kind === "LINK" ? `link:${item.code}` : `block:${item.id}`}
            item={item}
            idx={idx}
            totalCount={items.length}
            links={links}
            highlightedShortCode={highlightedShortCode}
            pendingShortCode={pendingShortCode}
            labelByShortCode={labelByShortCode}
            isDragging={dragIndex === idx}
            isOver={overIndex === idx && dragIndex !== null && dragIndex !== idx}
            sectionInfo={sectionInfo}
            indented={indented}
            onMove={onMove}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            onHighlight={onHighlight}
            onToggle={onToggle}
            onEditBlock={onEditBlock}
            onDeleteBlock={onDeleteBlock}
            onEditLabel={onEditLabel}
            t={t}
          />
        );
      })}
    </ul>
  );
}

type SectionHeaderInfo = {
  collapsed: boolean;
  count: number;
  onToggle: () => void;
};

type RowProps = {
  item: FeedItem;
  idx: number;
  totalCount: number;
  links: MyLink[];
  highlightedShortCode: string | null;
  pendingShortCode: string | null;
  labelByShortCode: Record<string, string>;
  isDragging: boolean;
  isOver: boolean;
  /** Non-null only on TEXT header rows — drives the collapse chevron + count chip. */
  sectionInfo: SectionHeaderInfo | null;
  /** True when this row sits inside a section (any non-TEXT row that follows a TEXT header).
   *  Drives the left rail + indent that signals "this belongs to the section above". */
  indented: boolean;
  onMove: (idx: number, direction: -1 | 1) => void;
  onDragStart: (idx: number, e: React.DragEvent) => void;
  onDragOver: (idx: number, e: React.DragEvent) => void;
  onDrop: (idx: number, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onHighlight: (shortCode: string) => void;
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
  pendingShortCode,
  labelByShortCode,
  isDragging,
  isOver,
  sectionInfo,
  indented,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onHighlight,
  onToggle,
  onEditBlock,
  onDeleteBlock,
  onEditLabel,
  t,
}: RowProps) {
  const dndProps = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => onDragStart(idx, e),
    onDragOver: (e: React.DragEvent) => onDragOver(idx, e),
    onDrop: (e: React.DragEvent) => onDrop(idx, e),
    onDragEnd,
  };
  // Drop-zone indicator: a thin accent bar that hovers just above the target row. Positioned
  // absolutely so it takes *zero* layout space — earlier versions added `mt-4` to push rows apart,
  // which combined with `transition-all` and the bubbling dragleave/dragover events made the row
  // animate open/closed at ~60Hz as the cursor crossed child elements ("엄청 깜빡거림"). The fix is
  // twofold: (1) drop the per-row onDragLeave handler at the call site so child-element traversal
  // no longer clears overIndex, (2) keep the indicator out of the layout flow so siblings don't
  // shift even when isOver flips quickly.
  const dropIndicator = isOver
    ? "before:pointer-events-none before:absolute before:inset-x-2 before:-top-[2px] before:h-1 before:rounded-full before:bg-accent-500 before:shadow-[0_0_10px_rgba(99,102,241,0.6)] "
    : "";
  // Lifted/transparent state while being dragged so the user perceives the dragged row as "in
  // their hand" rather than just half-faded in place.
  const draggingState = isDragging
    ? "scale-[0.98] opacity-30 ring-2 ring-accent-400 rounded-md "
    : "";
  // Indented rows (items that follow a TEXT header) get a thin accent-color rail on the left and
  // extra padding so the user can see "this belongs to the section above" without breaking the
  // flat-index drag layout — the rail is a left border, not a wrapping element, so drop indices
  // stay 1:1 with the flat items array.
  const indentRail = indented ? "border-l-2 border-accent-200 pl-4 " : "";
  // `relative` is permanent (not gated on isOver) so toggling the indicator doesn't reflow the row.
  // Transitions only animate properties that don't affect layout — opacity / transform / box-shadow —
  // so the dragged row fades smoothly without dragging siblings into a transition loop.
  const baseRow =
    "relative flex items-center justify-between gap-3 px-3 py-2 transition-[opacity,transform,box-shadow] duration-150 " +
    indentRail +
    draggingState +
    dropIndicator;
  const dragHandle = <DragHandle idx={idx} totalCount={totalCount} onMove={onMove} />;

  if (item.kind === "BLOCK" && item.type === "DIVIDER") {
    // Slim row — a divider on the public profile is a thin horizontal rule, so the editor row
    // shouldn't pretend it's a heavy item. Compact padding + a centered hr communicates that.
    const slimRow =
      "relative flex items-center gap-2 px-3 py-1 transition-[opacity,transform,box-shadow] duration-150 " +
      indentRail +
      draggingState +
      dropIndicator;
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
  if (item.kind === "BLOCK" && isCommonBlockType(item.type)) {
    const meta = BLOCK_ROW_META[item.type];
    const Icon = meta.Icon;
    const text = meta.render(item.content, t) || t(meta.placeholderKey);
    const textClass =
      meta.textStyle === "primary"
        ? "truncate text-sm font-medium text-slate-900"
        : "truncate text-[11px] text-slate-500";
    return (
      <li {...dndProps} className={baseRow}>
        {dragHandle}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className={textClass}>{text}</span>
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
    // TEXT is the section anchor: heavier background tint, chevron toggle on the left side of the
    // label so the disclosure affordance is sibling to the title, and an item-count chip on the
    // right side near the edit/delete actions. The chevron + count are decorations on top of the
    // existing row — drag, edit, and delete affordances stay identical to other blocks.
    const headerRow = baseRow + " bg-slate-50/60";
    const collapsed = sectionInfo?.collapsed ?? false;
    return (
      <li {...dndProps} className={headerRow}>
        {dragHandle}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {sectionInfo ? (
            <button
              type="button"
              onClick={sectionInfo.onToggle}
              aria-expanded={!collapsed}
              aria-label={collapsed ? t("sectionExpand") : t("sectionCollapse")}
              className="grid h-5 w-5 shrink-0 place-items-center rounded text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
            >
              {collapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <Type className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          )}
          <span className="truncate text-sm font-semibold text-slate-900">
            {summarizeTextBody(item.content) || t("addTextPlaceholder")}
          </span>
          {sectionInfo && sectionInfo.count > 0 && (
            <span className="shrink-0 rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              {t("sectionItemCount", { count: sectionInfo.count })}
            </span>
          )}
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
        <LinkLabelField
          shortCode={link.shortCode}
          currentLabel={labelByShortCode[link.shortCode] ?? ""}
          onSave={onEditLabel}
          t={t}
        />
        <p className="truncate font-mono text-[11px] text-slate-400">
          /{link.shortCode} · {link.originalUrl}
        </p>
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
        className="block w-full truncate border-b border-accent-300 bg-transparent text-sm font-medium text-slate-900 outline-none"
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
          ? "text-slate-900 hover:text-accent-700"
          : "text-accent-700 hover:text-accent-800")
      }
    >
      <span className="truncate underline decoration-dotted decoration-slate-300 underline-offset-2 group-hover:decoration-accent-400">
        {currentLabel || t("labelEmpty")}
      </span>
      <Pencil className="h-3 w-3 shrink-0 text-slate-300 transition group-hover:text-accent-500" />
    </button>
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
