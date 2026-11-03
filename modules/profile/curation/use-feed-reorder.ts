"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import { reorderProfileItems } from "@/lib/api";
import type { ProfileReorderItem } from "@/types";
import type { FeedItem } from "@/modules/profile/curation/types";

type Args = {
  items: FeedItem[];
  setItems: (items: FeedItem[]) => void;
};

export type FeedReorder = {
  dragIndex: number | null;
  overIndex: number | null;
  /** Mobile arrow-button move: the row steps one slot. */
  move: (itemIdx: number, direction: -1 | 1) => void;
  onDragStart: (idx: number, e: React.DragEvent) => void;
  onDragOver: (idx: number, e: React.DragEvent) => void;
  onDrop: (toIndex: number, e: React.DragEvent) => void;
  onDragEnd: () => void;
};

/**
 * Owns the HTML5 drag-and-drop indices and the reorder math for the profile feed.
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
    const swap = itemIdx + direction;
    if (swap < 0 || swap >= items.length) return;
    const next = items.slice();
    [next[itemIdx], next[swap]] = [next[swap], next[itemIdx]];
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
    const next = items.slice();
    const [moved] = next.splice(dragIndex, 1);
    next.splice(toIndex > dragIndex ? toIndex - 1 : toIndex, 0, moved);
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
