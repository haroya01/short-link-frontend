"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import {
  createHighlight,
  listHighlights,
  type HighlightView,
  type NewHighlight,
} from "@/modules/blog/api/highlights";

const MARK_CLASS = "kurl-highlight";
const MARK_STYLE = "background-color: rgba(5,150,105,0.18); border-radius: 2px;";

/**
 * Medium-style social highlights over the (server-rendered, static) `.prose-post` body. Because the
 * article body is a server component, React never re-renders it on the client — so this sibling
 * client component can safely reach into that static DOM to (a) paint existing highlights as
 * `<mark>` and (b) capture a text selection and offer a "highlight" action.
 *
 * v1 anchoring: rendering finds the FIRST occurrence of the stored quote in a single text node and
 * wraps it — robust for highlights within plain prose; a highlight spanning inline formatting
 * (bold/link) simply isn't painted yet (degrades, never breaks). Creation records the block index +
 * char offsets too, so future precision rendering can use them. NEEDS in-browser verification.
 */
export function PostHighlights({ postId }: { postId: number }) {
  const t = useTranslations("publicPost");
  const { authenticated, signInWithGoogle } = useAuth();
  const [highlights, setHighlights] = useState<HighlightView[]>([]);
  const [menu, setMenu] = useState<{ left: number; top: number; payload: NewHighlight } | null>(
    null,
  );

  useEffect(() => {
    let alive = true;
    listHighlights(postId)
      .then((h) => {
        if (alive) setHighlights(h);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [postId]);

  // Paint highlights into the static prose. Re-runs whenever the set changes.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".prose-post");
    if (!root) return;
    clearMarks(root);
    for (const h of highlights) wrapFirstQuote(root, h.quote);
  }, [highlights]);

  // Capture a selection inside the prose and offer the highlight action at the selection.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".prose-post");
    if (!root) return;
    const onMouseUp = () => {
      const payload = readSelection(root);
      if (!payload) {
        setMenu(null);
        return;
      }
      const rect = window.getSelection()!.getRangeAt(0).getBoundingClientRect();
      setMenu({ left: rect.left + rect.width / 2, top: rect.top, payload });
    };
    root.addEventListener("mouseup", onMouseUp);
    return () => root.removeEventListener("mouseup", onMouseUp);
  }, []);

  const commit = useCallback(async () => {
    if (!menu) return;
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    const payload = menu.payload;
    setMenu(null);
    window.getSelection()?.removeAllRanges();
    try {
      await createHighlight(postId, payload);
      setHighlights(await listHighlights(postId));
    } catch {
      /* swallow — a failed highlight shouldn't disrupt reading */
    }
  }, [menu, authenticated, postId, signInWithGoogle]);

  if (!menu) return null;
  return (
    <button
      type="button"
      className="fixed z-50 -translate-x-1/2 -translate-y-full rounded-full bg-slate-900 px-3.5 py-1.5 text-[13px] font-medium text-white shadow-lg dark:bg-white dark:text-slate-900"
      style={{ left: menu.left, top: menu.top - 8 }}
      // Keep the text selection alive through the click (mousedown would otherwise clear it).
      onMouseDown={(e) => e.preventDefault()}
      onClick={commit}
    >
      {t("highlight")}
    </button>
  );
}

/** Read the current selection as a single-block highlight payload, or null if it isn't one. */
function readSelection(root: HTMLElement): NewHighlight | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  const quote = sel.toString().trim();
  if (quote.length < 1 || quote.length > 1000) return null;
  const block = directChild(root, range.startContainer);
  if (!block || directChild(root, range.endContainer) !== block) return null; // single block (v1)
  const blockOrder = Array.prototype.indexOf.call(root.children, block);
  const startOffset = offsetWithin(block, range.startContainer, range.startOffset);
  const endOffset = offsetWithin(block, range.endContainer, range.endOffset);
  if (endOffset <= startOffset) return null;
  return { blockOrder, startOffset, endOffset, quote };
}

/** The `.prose-post` direct-child element that contains `node` (a block), or null. */
function directChild(root: HTMLElement, node: Node): Element | null {
  let el: Node | null = node;
  while (el && el.parentNode !== root) el = el.parentNode;
  return el && el.nodeType === Node.ELEMENT_NODE ? (el as Element) : null;
}

/** Character offset of (node, offset) within `block`'s concatenated text. */
function offsetWithin(block: Element, node: Node, offset: number): number {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let count = 0;
  let n = walker.nextNode();
  while (n) {
    if (n === node) return count + offset;
    count += n.textContent?.length ?? 0;
    n = walker.nextNode();
  }
  return count + offset;
}

/** Unwrap every highlight `<mark>` (so the set can be repainted from scratch). */
function clearMarks(root: HTMLElement) {
  root.querySelectorAll(`mark.${MARK_CLASS}`).forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });
}

/** Wrap the first occurrence of `quote` (within a single text node) in a highlight `<mark>`. */
function wrapFirstQuote(root: HTMLElement, quote: string) {
  if (!quote) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement?.closest(`mark.${MARK_CLASS}`)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  let n = walker.nextNode() as Text | null;
  while (n) {
    const idx = n.data.indexOf(quote);
    if (idx >= 0) {
      const range = document.createRange();
      range.setStart(n, idx);
      range.setEnd(n, idx + quote.length);
      const mark = document.createElement("mark");
      mark.className = MARK_CLASS;
      mark.setAttribute("style", MARK_STYLE);
      try {
        range.surroundContents(mark);
      } catch {
        /* range crosses element boundaries — skip painting this one (v1) */
      }
      return;
    }
    n = walker.nextNode() as Text | null;
  }
}
