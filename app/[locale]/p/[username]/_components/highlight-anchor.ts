/** DOM anchors shared by highlight painting and source navigation. */
export const MARK_CLASS = "kurl-highlight";
const THREAD_CLASS = "kurl-highlight--thread";

export type HighlightMeta = { id: number; note: string | null; replyCount: number };
export type HighlightSpan = {
  blockOrder: number;
  endBlockOrder: number;
  startOffset: number;
  endOffset: number;
  quote: string;
};

type TextPiece = { node: Text; start: number };
type TextIndex = { full: string; pieces: TextPiece[]; blocks: { start: number; length: number }[] };
type ResolvedRange = { index: TextIndex; start: number; end: number };

function styleMark(mark: HTMLElement, metadata: HighlightMeta[]) {
  mark.className = metadata.some((m) => !!m.note || m.replyCount > 0)
    ? `${MARK_CLASS} ${THREAD_CLASS}` : MARK_CLASS;
  mark.dataset.hlId = String(metadata[0].id);
  mark.dataset.hlIds = metadata.map((m) => m.id).join(",");
  mark.dataset.hlMeta = JSON.stringify(metadata);
  const notes = metadata.flatMap((m) => m.note ? [m.note] : []);
  if (notes.length) mark.title = notes.join("\n\n");
  mark.tabIndex = 0;
  mark.setAttribute("role", "button");
}

/** Every overlapping conversation remains addressable without nested/darker marks. */
export function highlightIdsForMark(mark: HTMLElement): number[] {
  return (mark.dataset.hlIds ?? mark.dataset.hlId ?? "").split(",")
    .map(Number).filter((id) => Number.isSafeInteger(id) && id > 0);
}

export function clearMarks(root: HTMLElement) {
  root.querySelectorAll(`mark.${MARK_CLASS}`).forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });
}

/** Include already marked text in the coordinates. A newline separates DOM blocks. */
function textIndex(root: HTMLElement): TextIndex {
  const pieces: TextPiece[] = [];
  const blocks: TextIndex["blocks"] = [];
  let full = "";
  for (const block of Array.from(root.children)) {
    if (blocks.length) full += "\n";
    const start = full.length;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      pieces.push({ node, start: full.length });
      full += node.data;
    }
    blocks.push({ start, length: full.length - start });
  }
  return { full, pieces, blocks };
}

function normalizeWithMap(raw: string, skip?: ReadonlySet<number>): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (skip?.has(i)) continue;
    const char = /\s/.test(raw[i]) ? " " : raw[i];
    if (char === " " && norm.endsWith(" ")) continue;
    norm += char;
    map.push(i);
  }
  return { norm, map };
}

function normalized(raw: string): string {
  return normalizeWithMap(raw).norm.trim();
}

/** A moved quote is recoverable only when exactly one occurrence remains. */
function uniqueQuote(index: TextIndex, quote: string): ResolvedRange | null {
  const needle = normalized(quote);
  if (!needle) return null;
  // Selection text differs across engines: paragraph boundaries may be newlines or omitted.
  // Try both representations, while retaining source offsets and rejecting distinct matches.
  const boundaries = new Set(index.blocks.slice(1).map((block) => block.start - 1));
  const candidates = new Map<string, ResolvedRange>();
  for (const skip of [undefined, boundaries]) {
    const { norm, map } = normalizeWithMap(index.full, skip);
    let at = norm.indexOf(needle);
    while (at >= 0) {
      const start = map[at];
      const end = map[at + needle.length - 1] + 1;
      candidates.set(`${start}:${end}`, { index, start, end });
      if (candidates.size > 1) return null;
      at = norm.indexOf(needle, at + 1);
    }
  }
  return candidates.values().next().value ?? null;
}

/** Validate the stored quote before trusting coordinates, then recover a unique moved quote. */
function resolveHighlight(root: HTMLElement, span: HighlightSpan): ResolvedRange | null {
  const index = textIndex(root);
  const endBlock = span.endBlockOrder ?? span.blockOrder;
  const first = index.blocks[span.blockOrder];
  const last = index.blocks[endBlock];
  if (first && last && endBlock >= span.blockOrder && span.startOffset >= 0 && span.endOffset >= 0
    && span.startOffset <= first.length && span.endOffset <= last.length) {
    const start = first.start + span.startOffset;
    const end = last.start + span.endOffset;
    const text = index.full.slice(start, end);
    const boundaries = new Set(index.blocks.slice(1)
      .map((block) => block.start - 1 - start).filter((at) => at >= 0 && at < text.length));
    const quote = normalized(span.quote);
    if (start < end && (normalized(text) === quote || normalizeWithMap(text, boundaries).norm.trim() === quote)) {
      return { index, start, end };
    }
  }
  return uniqueQuote(index, span.quote);
}

function makeMark(text: string, metadata: HighlightMeta[]): HTMLElement {
  const mark = document.createElement("mark");
  styleMark(mark, metadata);
  mark.textContent = text;
  return mark;
}

/** Split an existing flat mark at overlap boundaries, keeping every original conversation ID. */
function paintSlice(node: Text, from: number, to: number, meta: HighlightMeta) {
  const parent = node.parentElement;
  if (parent?.classList.contains(MARK_CLASS) && parent.childNodes.length === 1) {
    const existing = JSON.parse(parent.dataset.hlMeta ?? "[]") as HighlightMeta[];
    if (existing.some((m) => m.id === meta.id)) return;
    const replacements: Node[] = [];
    if (from > 0) replacements.push(makeMark(node.data.slice(0, from), existing));
    replacements.push(makeMark(node.data.slice(from, to), [...existing, meta]));
    if (to < node.length) replacements.push(makeMark(node.data.slice(to), existing));
    parent.replaceWith(...replacements);
    return;
  }
  const range = document.createRange();
  range.setStart(node, from);
  range.setEnd(node, to);
  const mark = document.createElement("mark");
  styleMark(mark, [meta]);
  range.surroundContents(mark);
}

function paintRange(range: ResolvedRange, meta: HighlightMeta): boolean {
  const slices = range.index.pieces.flatMap((piece) => {
    const from = Math.max(range.start, piece.start) - piece.start;
    const to = Math.min(range.end, piece.start + piece.node.length) - piece.start;
    return from < to ? [{ node: piece.node, from, to }] : [];
  });
  for (const slice of slices) paintSlice(slice.node, slice.from, slice.to, meta);
  return slices.length > 0;
}

/** Low-level exact paint; the quote-aware entry point is wrapHighlight. */
export function wrapAtOffsets(
  root: HTMLElement, blockOrder: number, startOffset: number, endOffset: number, meta: HighlightMeta,
): boolean {
  const index = textIndex(root);
  const block = index.blocks[blockOrder];
  if (!block || startOffset < 0 || startOffset >= endOffset || endOffset > block.length) return false;
  return paintRange({ index, start: block.start + startOffset, end: block.start + endOffset }, meta);
}

/** Legacy export name; ambiguous quote-only anchors deliberately remain unpainted. */
export function wrapFirstQuote(root: HTMLElement, quote: string, meta: HighlightMeta) {
  const range = uniqueQuote(textIndex(root), quote);
  if (range) paintRange(range, meta);
}

export function wrapHighlight(root: HTMLElement, span: HighlightSpan, meta: HighlightMeta) {
  const range = resolveHighlight(root, span);
  if (range) paintRange(range, meta);
}

/** Shared resolution handles multi-block/inline quotes, hidden marks, and ID-backed exact anchors. */
export function findQuoteTarget(
  root: HTMLElement, quote: string, span?: HighlightSpan,
): HTMLElement | null {
  const range = span ? resolveHighlight(root, span) : uniqueQuote(textIndex(root), quote);
  if (!range) return null;
  return range.index.pieces.find((p) => p.start + p.node.length > range.start && p.start < range.end)
    ?.node.parentElement ?? null;
}

/** DOM Range endpoints can be text nodes or element boundaries (keyboard/select-all). */
export function readHighlightSelection(root: HTMLElement): HighlightSpan | null {
  const selection = root.ownerDocument.defaultView?.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  const quote = selection.toString().trim();
  if (!quote || quote.length > 1000) return null;
  const directChild = (node: Node): Element | null => {
    let current: Node | null = node;
    while (current && current.parentNode !== root) current = current.parentNode;
    return current?.nodeType === Node.ELEMENT_NODE ? current as Element : null;
  };
  const first = range.startContainer === root ? root.children[range.startOffset] : directChild(range.startContainer);
  const last = range.endContainer === root ? root.children[range.endOffset - 1] : directChild(range.endContainer);
  if (!first || !last) return null;
  const blockOrder = Array.prototype.indexOf.call(root.children, first);
  const endBlockOrder = Array.prototype.indexOf.call(root.children, last);
  if (blockOrder < 0 || endBlockOrder < blockOrder) return null;
  const offsetWithin = (block: Element, node: Node, offset: number) => {
    const prefix = root.ownerDocument.createRange();
    prefix.selectNodeContents(block);
    prefix.setEnd(node, offset);
    return prefix.toString().length;
  };
  const startOffset = range.startContainer === root ? 0 : offsetWithin(first, range.startContainer, range.startOffset);
  const endOffset = range.endContainer === root ? (last.textContent?.length ?? 0) : offsetWithin(last, range.endContainer, range.endOffset);
  if (blockOrder === endBlockOrder && endOffset <= startOffset) return null;
  return { blockOrder, endBlockOrder, startOffset, endOffset, quote };
}
