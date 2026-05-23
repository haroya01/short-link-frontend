import type { FeedItem } from "./types";

/**
 * Exclusive upper-bound index of the section that starts at {@code from} — i.e. the index of the
 * next TEXT block, or {@code arr.length} if none follows. Used by both drag-and-drop and the
 * mobile ↑↓ buttons to splice out the [header, ...children] range as one contiguous block.
 */
export function findNextTextHeader(arr: FeedItem[], from: number): number {
  for (let i = from; i < arr.length; i++) {
    const it = arr[i];
    if (it.kind === "BLOCK" && it.type === "TEXT") return i;
  }
  return arr.length;
}

/**
 * Start index of the "unit" that ends just before {@code idx}. A unit is either a single
 * non-header row or an entire TEXT-anchored section. When the row directly above {@code idx} is
 * itself inside a section, the unit start is that section's TEXT header — otherwise it's just
 * the row above. Powers the section-aware mobile ↑ button.
 */
export function findUnitStartBefore(arr: FeedItem[], idx: number): number {
  if (idx <= 0) return 0;
  const above = arr[idx - 1];
  if (above.kind === "BLOCK" && above.type === "TEXT") return idx - 1;
  for (let j = idx - 1; j >= 0; j--) {
    const it = arr[j];
    if (it.kind === "BLOCK" && it.type === "TEXT") return j;
  }
  return idx - 1;
}

/**
 * Exclusive end index of the unit that starts at {@code idx}. Mirrors {@link findUnitStartBefore}
 * looking downward — a TEXT header consumes its children, a non-header consumes only itself.
 * Used by the section-aware mobile ↓ button to know where to land the moved section.
 */
export function findUnitEndAfter(arr: FeedItem[], idx: number): number {
  if (idx >= arr.length) return arr.length;
  const first = arr[idx];
  if (first.kind === "BLOCK" && first.type === "TEXT") {
    return findNextTextHeader(arr, idx + 1);
  }
  return idx + 1;
}
