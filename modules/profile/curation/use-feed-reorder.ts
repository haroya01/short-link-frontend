"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import { reorderProfileItems } from "@/lib/api";
import type { ProfileReorderItem } from "@/types";
import type { FeedItem } from "@/modules/profile/curation/types";
import {
  findNextTextHeader,
  findUnitEndAfter,
  findUnitStartBefore,
} from "@/modules/profile/curation/feed-helpers";

type Args = {
  items: FeedItem[];
  setItems: (items: FeedItem[]) => void;
};

export type FeedReorder = {
  dragIndex: number | null;
  overIndex: number | null;
  /**
   * Mobile arrow-button move. Single-row items step one slot; TEXT headers move the whole section
   * (header + children) as one unit.
   */
  move: (itemIdx: number, direction: -1 | 1) => void;
  onDragStart: (idx: number, e: React.DragEvent) => void;
  onDragOver: (idx: number, e: React.DragEvent) => void;
  onDrop: (toIndex: number, e: React.DragEvent) => void;
  onDragEnd: () => void;
};

/**
 * Owns the HTML5 drag-and-drop indices and the section-aware reorder math for the profile feed.
 * Both the desktop drag flow and the mobile arrow buttons land in the same {@link commitOrder}
 * that optimistically updates the feed then sync the new order to BE; on failure we roll back.
 */
export function useFeedReorder({ items, setItems }: Args): FeedReorder {
  const t = useTranslations("settings.profile");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function toReorderTokens(arr: FeedItem[]): ProfileReorderItem[] {
    return arr.map((it) =>
      it.kind === "LINK"
        ? { kind: "LINK", id: it.code }
        : { kind: "BLOCK", id: String(it.id) },
    );
  }

  async function commitOrder(next: FeedItem[]) {
    const prev = items;
    setItems(next);
    try {
      await reorderProfileItems(toReorderTokens(next));
    } catch (err) {
      setItems(prev);
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  function move(itemIdx: number, direction: -1 | 1) {
    const moved = items[itemIdx];
    const isSectionMove = moved.kind === "BLOCK" && moved.type === "TEXT";
    if (!isSectionMove) {
      const swap = itemIdx + direction;
      if (swap < 0 || swap >= items.length) return;
      const next = items.slice();
      [next[itemIdx], next[swap]] = [next[swap], next[itemIdx]];
      void commitOrder(next);
      return;
    }
    // Section move: the dragged unit is [itemIdx, sectionEnd) — header + its children.
    const sectionEnd = findNextTextHeader(items, itemIdx + 1);
    const myRange = sectionEnd - itemIdx;
    if (direction === -1) {
      if (itemIdx === 0) return;
      // The "unit above" is either a single non-header row or the entire preceding section. Land
      // at the start of that unit so a section hop = swap of two adjacent units.
      const prevUnitStart = findUnitStartBefore(items, itemIdx);
      const next = items.slice();
      const range = next.splice(itemIdx, myRange);
      next.splice(prevUnitStart, 0, ...range);
      void commitOrder(next);
      return;
    }
    if (sectionEnd >= items.length) return;
    const nextUnitEnd = findUnitEndAfter(items, sectionEnd);
    const next = items.slice();
    const range = next.splice(itemIdx, myRange);
    next.splice(nextUnitEnd - myRange, 0, ...range);
    void commitOrder(next);
  }

  function onDragStart(idx: number, e: React.DragEvent) {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
    // Some browsers refuse to start the drag without a payload.
    const item = items[idx];
    e.dataTransfer.setData(
      "text/plain",
      item.kind === "LINK" ? `link:${item.code}` : `block:${item.id}`,
    );
  }

  function onDragOver(idx: number, e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overIndex !== idx) setOverIndex(idx);
  }

  function onDrop(toIndex: number, e: React.DragEvent) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    // When the user drags a TEXT block, treat it as a section-level move: pick up the header
    // plus the contiguous run of non-TEXT rows that follow (up to the next TEXT or the end of
    // the list). Non-TEXT rows fall back to the simple one-item splice.
    const dragged = items[dragIndex];
    const sectionEndExclusive =
      dragged.kind === "BLOCK" && dragged.type === "TEXT"
        ? findNextTextHeader(items, dragIndex + 1)
        : dragIndex + 1;
    // Drop targets that fall inside the source range are a no-op — moving a section onto itself
    // doesn't make sense and would otherwise produce a confusing splice.
    if (toIndex >= dragIndex && toIndex < sectionEndExclusive) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = items.slice();
    const moved = next.splice(dragIndex, sectionEndExclusive - dragIndex);
    // Account for the shift from removing items above the drop target.
    const adjustedTo = toIndex > dragIndex ? toIndex - moved.length : toIndex;
    next.splice(adjustedTo, 0, ...moved);
    setDragIndex(null);
    setOverIndex(null);
    void commitOrder(next);
  }

  function onDragEnd() {
    setDragIndex(null);
    setOverIndex(null);
  }

  return { dragIndex, overIndex, move, onDragStart, onDragOver, onDrop, onDragEnd };
}
