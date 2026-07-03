/**
 * Which reader highlights get painted into the post body — the Medium "Top highlight" rule.
 *
 * Painting every reader's highlight turns a popular post into a wall of green. So the body only paints
 * a highlight when at least one of these holds:
 *   1. it's the viewer's OWN highlight (always painted — unchanged behavior);
 *   2. it carries a thread — a public margin note or at least one reply. These are the Are.na-style
 *      curator conversations, and the reply thread is reachable ONLY by tapping the painted mark (the
 *      web reader has no separate highlights rail), so unpainting them would hide the conversation.
 *      They're also rare and high-effort, so they don't cause the clutter this rule targets;
 *   3. it's a "top" highlight — its passage is shared by at least {@link TOP_HIGHLIGHT_MIN_READERS}
 *      distinct OTHER readers (overlapping spans).
 *
 * Everything else — a bare quick-highlight from one other reader that few people share — is dropped
 * from the body. It stays in the data ({@code listHighlights} still returns it) and remains reachable
 * via `?hl=` deep-links, so nothing is lost; it's only kept out of the painted body.
 *
 * Pure functions (no DOM / React), so the same rules unit-test in jsdom and can be mirrored 1:1 by the
 * native iOS reader.
 */

/** A passage counts as a "top highlight" once this many DISTINCT other readers share it. Small-community
 *  default of 2 — raise it as the reader base grows and popular posts accumulate more overlap. */
export const TOP_HIGHLIGHT_MIN_READERS = 2;

/** The fields the paint rule needs from a highlight (a structural subset of {@code HighlightView}). */
export interface PaintCandidate {
  id: number;
  author: { id: number } | null;
  /** First block of the span. */
  blockOrder: number;
  /** Last block of the span (== blockOrder for a single-block highlight). */
  endBlockOrder: number;
  /** Char offset of the start within blockOrder, and of the end within endBlockOrder. */
  startOffset: number;
  endOffset: number;
  note: string | null;
  replyCount: number;
}

/** A (block, char-offset) position; two of these bound a highlight's span. */
type Pos = { block: number; offset: number };

/** Order positions by block, then char offset (a total order over the body). */
function comparePos(a: Pos, b: Pos): number {
  return a.block !== b.block ? a.block - b.block : a.offset - b.offset;
}

const startPos = (h: PaintCandidate): Pos => ({ block: h.blockOrder, offset: h.startOffset });
const endPos = (h: PaintCandidate): Pos => ({ block: h.endBlockOrder, offset: h.endOffset });

/**
 * Group highlights into clusters of overlapping passages. Two highlights are in the same cluster when
 * their [start, end) spans overlap, transitively (a chain A–B, B–C puts A, B, C together). Touching
 * spans (one ends exactly where the next starts) are treated as separate — they're adjacent passages,
 * not the same one. Classic interval-merge: sort by start, extend the running end while it overlaps.
 */
export function clusterByOverlap<T extends PaintCandidate>(highlights: readonly T[]): T[][] {
  const sorted = [...highlights].sort(
    (a, b) => comparePos(startPos(a), startPos(b)) || comparePos(endPos(a), endPos(b)),
  );
  const clusters: T[][] = [];
  let current: T[] = [];
  let currentEnd: Pos | null = null;
  for (const h of sorted) {
    if (currentEnd && comparePos(startPos(h), currentEnd) < 0) {
      current.push(h);
      if (comparePos(endPos(h), currentEnd) > 0) currentEnd = endPos(h);
    } else {
      if (current.length) clusters.push(current);
      current = [h];
      currentEnd = endPos(h);
    }
  }
  if (current.length) clusters.push(current);
  return clusters;
}

/** Does this highlight carry a conversation (a public note or at least one reply)? */
function hasThread(h: PaintCandidate): boolean {
  return (h.note != null && h.note.trim() !== "") || h.replyCount > 0;
}

/**
 * The ids of the highlights to paint into the body, per the rule documented at the top of this file:
 * the viewer's own, any that carry a thread, and any in a cluster shared by >= {@code threshold}
 * distinct OTHER readers. `meId` is null for a signed-out reader (nothing is "own").
 */
export function selectPaintedHighlightIds(
  highlights: readonly PaintCandidate[],
  meId: number | null,
  threshold: number = TOP_HIGHLIGHT_MIN_READERS,
): Set<number> {
  const painted = new Set<number>();
  for (const cluster of clusterByOverlap(highlights)) {
    // Distinct readers OTHER than the viewer whose highlights land in this cluster — the viewer's own
    // presence never promotes someone else's highlight into "top".
    const distinctOthers = new Set<number>();
    for (const h of cluster) {
      if (h.author && h.author.id !== meId) distinctOthers.add(h.author.id);
    }
    const isTop = distinctOthers.size >= threshold;
    for (const h of cluster) {
      const mine = meId != null && h.author?.id === meId;
      if (mine || hasThread(h) || isTop) painted.add(h.id);
    }
  }
  return painted;
}
