"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import {
  createHighlight,
  listHighlights,
  type HighlightView,
  type NewHighlight,
} from "@/modules/blog/api/highlights";
import { clearMarks, wrapAtOffsets, wrapFirstQuote } from "./highlight-anchor";

type Anchor = { left: number; top: number; bottom: number };

/**
 * Medium-style social highlights over the (server-rendered, static) `.prose-post` body. Because the
 * article body is a server component, React never re-renders it on the client — so this sibling
 * client component can safely reach into that static DOM to (a) paint existing highlights as
 * `<mark>` and (b) capture a text selection and offer "highlight" / "add a memo" actions.
 *
 * Selection is finalized on pointer release (mouseup AND touchend) so it works on touch, and the
 * floating action bar is dismissed on scroll or when the selection collapses (no stale, jumping bar —
 * the previous mouseup-only version "bounced" on mobile). The memo composer is a bottom sheet that
 * lifts above the on-screen keyboard via the visualViewport inset, so writing a note on mobile is
 * stable.
 *
 * v1 anchoring: rendering finds the FIRST occurrence of the stored quote in a single text node and
 * wraps it — robust for highlights within plain prose; a highlight spanning inline formatting
 * (bold/link) simply isn't painted yet (degrades, never breaks). Creation records the block index +
 * char offsets too, so future precision rendering can use them.
 */
export function PostHighlights({ postId }: { postId: number }) {
  const t = useTranslations("publicPost");
  const { authenticated, signInWithGoogle } = useAuth();
  const [highlights, setHighlights] = useState<HighlightView[]>([]);
  // The live selection → drives the floating action bar.
  const [sel, setSel] = useState<{ anchor: Anchor; payload: NewHighlight } | null>(null);
  // When set, the memo sheet is open for this span.
  const [noteFor, setNoteFor] = useState<NewHighlight | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

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
    for (const h of highlights) {
      // Precise: paint the exact stored span (block + char offsets), which survives a quote that
      // recurs and spans inline formatting. Fall back to a text search only when the offsets no longer
      // line up (the post was edited after the highlight was made).
      if (!wrapAtOffsets(root, h.blockOrder, h.startOffset, h.endOffset, h.note)) {
        wrapFirstQuote(root, h.quote, h.note);
      }
    }
  }, [highlights]);

  // Capture a selection inside the prose and offer the highlight actions at the selection. Finalize on
  // pointer release (works for both mouse and touch); a collapsed selection or a scroll dismisses the bar.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".prose-post");
    if (!root) return;

    const finalize = (e: Event) => {
      // Ignore releases on the action bar itself (tapping a button must not re-read / hide it).
      if (e.target instanceof Node && barRef.current?.contains(e.target)) return;
      const payload = readSelection(root);
      if (!payload) {
        setSel(null);
        return;
      }
      const rect = window.getSelection()!.getRangeAt(0).getBoundingClientRect();
      setSel({
        anchor: { left: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom },
        payload,
      });
    };
    // While dragging, only HIDE on a fully-collapsed selection — never reposition (that caused the jump).
    const onSelectionChange = () => {
      const s = window.getSelection();
      if (!s || s.isCollapsed) setSel(null);
    };
    const onScroll = () => setSel(null);

    document.addEventListener("mouseup", finalize);
    document.addEventListener("touchend", finalize);
    document.addEventListener("selectionchange", onSelectionChange);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mouseup", finalize);
      document.removeEventListener("touchend", finalize);
      document.removeEventListener("selectionchange", onSelectionChange);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const persist = useCallback(
    async (payload: NewHighlight) => {
      try {
        await createHighlight(postId, payload);
        setHighlights(await listHighlights(postId));
      } catch {
        /* swallow — a failed highlight shouldn't disrupt reading */
      }
    },
    [postId],
  );

  // Quick highlight (no memo).
  const commitQuick = useCallback(() => {
    if (!sel) return;
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    const payload = sel.payload;
    setSel(null);
    window.getSelection()?.removeAllRanges();
    void persist(payload);
  }, [sel, authenticated, signInWithGoogle, persist]);

  // Open the memo composer. Auth-gate up front so a Google redirect never discards a written note.
  const openNote = useCallback(() => {
    if (!sel) return;
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    setNoteFor(sel.payload);
    setSel(null);
    window.getSelection()?.removeAllRanges();
  }, [sel, authenticated, signInWithGoogle]);

  const saveNote = useCallback(
    (note: string) => {
      if (!noteFor) return;
      const payload = { ...noteFor, note: note.trim() || null };
      setNoteFor(null);
      void persist(payload);
    },
    [noteFor, persist],
  );

  return (
    <>
      {sel && (
        <SelectionBar
          innerRef={barRef}
          anchor={sel.anchor}
          highlightLabel={t("highlight")}
          noteLabel={t("highlightNote")}
          onHighlight={commitQuick}
          onNote={openNote}
        />
      )}
      {noteFor && (
        <NoteSheet
          quote={noteFor.quote}
          title={t("highlightNoteTitle")}
          placeholder={t("highlightNotePlaceholder")}
          saveLabel={t("highlightNoteSave")}
          cancelLabel={t("highlightNoteCancel")}
          onCancel={() => setNoteFor(null)}
          onSave={saveNote}
        />
      )}
    </>
  );
}

/** Floating two-action bar pinned to the selection. Placed above the span, or below it when the span
 *  sits too near the top of the viewport to fit a bar above. Fixed + viewport-relative rect coords
 *  match, so it tracks the selection without the scroll-driven bounce of repositioning on every event. */
function SelectionBar({
  innerRef,
  anchor,
  highlightLabel,
  noteLabel,
  onHighlight,
  onNote,
}: {
  innerRef: React.Ref<HTMLDivElement>;
  anchor: Anchor;
  highlightLabel: string;
  noteLabel: string;
  onHighlight: () => void;
  onNote: () => void;
}) {
  const above = anchor.top > 64;
  const left = Math.min(Math.max(anchor.left, 90), (typeof window !== "undefined" ? window.innerWidth : 360) - 90);
  return (
    <div
      ref={innerRef}
      role="toolbar"
      // Keep the text selection alive through the click so it doesn't visibly collapse mid-tap.
      onMouseDown={(e) => e.preventDefault()}
      className="fixed z-50 flex -translate-x-1/2 items-center overflow-hidden rounded-full bg-slate-900 text-[13px] font-medium text-white shadow-lg dark:bg-white dark:text-slate-900"
      style={{
        left,
        top: above ? anchor.top - 10 : anchor.bottom + 10,
        transform: `translateX(-50%)${above ? " translateY(-100%)" : ""}`,
      }}
    >
      <button type="button" onClick={onHighlight} className="px-3.5 py-1.5 transition-colors hover:bg-white/10 focus-ring dark:hover:bg-slate-900/10">
        {highlightLabel}
      </button>
      <span aria-hidden className="h-4 w-px bg-white/20 dark:bg-slate-900/15" />
      <button type="button" onClick={onNote} className="px-3.5 py-1.5 transition-colors hover:bg-white/10 focus-ring dark:hover:bg-slate-900/10">
        {noteLabel}
      </button>
    </div>
  );
}

/** Memo composer — a bottom sheet on mobile (centered card on sm+). The sheet sits at the bottom of a
 *  full-screen flex container whose bottom padding tracks the on-screen keyboard (visualViewport), so
 *  the textarea is never hidden behind the keyboard while writing. */
function NoteSheet({
  quote,
  title,
  placeholder,
  saveLabel,
  cancelLabel,
  onCancel,
  onSave,
}: {
  quote: string;
  title: string;
  placeholder: string;
  saveLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const inset = useKeyboardInset();

  // Esc closes the sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4"
      style={{ paddingBottom: inset }}
      onMouseDown={onCancel}
    >
      <div
        className="w-full rounded-t-2xl bg-white p-5 shadow-xl dark:bg-slate-900 sm:max-w-md sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <blockquote className="mt-3 line-clamp-3 border-l-2 border-accent-300 pl-3 text-[13px] leading-relaxed text-slate-500 dark:border-accent-500/40 dark:text-slate-400">
          {quote}
        </blockquote>
        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          aria-label={title}
          placeholder={placeholder}
          className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-[15px] leading-relaxed outline-none transition-colors focus:border-accent-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-ring dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onSave(note)}
            className="rounded-lg bg-accent-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-800 focus-ring"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The on-screen keyboard height: how much shorter the visual viewport is than the layout viewport.
 *  Used to lift the bottom sheet above the keyboard on mobile (no-op on desktop / browsers without
 *  visualViewport). */
function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
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
