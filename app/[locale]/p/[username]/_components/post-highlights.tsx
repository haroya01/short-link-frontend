"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { DATE_LOCALE } from "@/lib/date";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/use-confirm";
import {
  createHighlight,
  createHighlightReply,
  deleteHighlight,
  deleteHighlightReply,
  listHighlightReplies,
  listHighlights,
  type HighlightReplyView,
  type HighlightView,
  type NewHighlight,
} from "@/modules/blog/api/highlights";
import { CommentBody } from "@/modules/blog/components/comment-markdown";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { CornerDownRight, FolderPlus, Globe, Highlighter, Link as LinkIcon, Lock, PenLine, Trash2 } from "lucide-react";
import { blogPath } from "@/lib/host";
import { ConnectSheet } from "@/modules/blog/components/connect-sheet";
import {
  listCollectionsContainingHighlight,
  listRelatedBlocks,
  type CollectionSummary,
  type RelatedBlock,
} from "@/modules/blog/api/collections";
import { ConnectionBlock } from "@/modules/blog/components/connection-block";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { authorHref } from "@/modules/blog/components/feed-card";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { selectPaintedHighlightIds } from "@/modules/blog/lib/highlight-clustering";
import { useShowHighlights } from "@/modules/blog/lib/use-show-highlights";
import { clearMarks, findQuoteTarget, highlightIdsForMark, readHighlightSelection, wrapHighlight, MARK_CLASS } from "./highlight-anchor";
import { HighlightNoteSheet } from "@/modules/blog/components/highlight-note-sheet";

// The reply composer (HighlightThread) and note editor (NoteSheet) both pull in the Tiptap/ProseMirror
// editor — a heavy graph no reader touches until they open a thread or write a memo. Both only render
// inside an already-open overlay, so a dynamic (ssr:false) import splits the editor into its own chunk
// and keeps it out of the post page's initial JS: it loads when the sheet opens, not on page load. A
// resting skeleton the size of the collapsed field holds its place while the chunk streams in.
const CommentComposer = dynamic(
  () => import("@/modules/blog/components/comment-composer").then((m) => m.CommentComposer),
  { ssr: false, loading: () => <ComposerSkeleton /> },
);

/** Matches the collapsed rest-state height of the real editor so the mount doesn't shift layout. */
function ComposerSkeleton() {
  return <div className="h-12 rounded-lg border border-slate-200 dark:border-slate-700" />;
}

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
 * Anchors validate the stored quote against live coordinates, then recover only an unambiguous quote.
 * Inline and multi-block spans share that resolver with source navigation. Overlapping marks keep all
 * conversation IDs on one layer, so readers can choose the note they meant to open.
 */
export function PostHighlights({ postId }: { postId: number }) {
  const t = useTranslations("publicPost");
  const { authenticated, me, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  // Reader-level "paint highlights or read clean" toggle (device-local, default ON). Hiding stops the
  // painting but never the ability to create a highlight from a selection.
  const { show: showHighlights, toggle: toggleHighlights } = useShowHighlights();
  const [highlights, setHighlights] = useState<HighlightView[]>([]);
  // Whether the highlight fetch has settled (resolved or failed) at least once. The deep-link scroll
  // waits on this — not on there being any highlights — so a post with zero highlights still runs.
  const [highlightsLoaded, setHighlightsLoaded] = useState(false);
  // When set, the reply-thread sheet is open for this highlight.
  const [threadFor, setThreadFor] = useState<HighlightView | null>(null);
  const [threadChoices, setThreadChoices] = useState<HighlightView[]>([]);
  // The live selection → drives the floating action bar.
  const [sel, setSel] = useState<{ anchor: Anchor; payload: NewHighlight } | null>(null);
  // When set, the memo sheet is open for this span.
  const [noteFor, setNoteFor] = useState<NewHighlight | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // Mounted gate so the portal (in the return) only reaches for document.body on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let alive = true;
    listHighlights(postId)
      .then((h) => {
        if (alive) setHighlights(h);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setHighlightsLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [postId]);

  // How many highlights would paint under the Medium clustering rule — drives whether the "hide
  // highlights" toggle is worth showing (a control that hides nothing is just noise).
  const [paintableCount, setPaintableCount] = useState(0);

  // Paint highlights into the static prose. Re-runs whenever the set (or the viewer) changes, or when
  // the reader flips the show/hide toggle — hiding clears every mark and paints nothing.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".prose-post");
    if (!root) return;
    clearMarks(root);
    // Medium "Top highlight" rule: paint the viewer's own + any that carry a thread + passages shared
    // by enough distinct other readers; a lone reader's bare highlight stays in the data (and its
    // thread stays reachable via ?hl=) but doesn't clutter the body. See highlight-clustering.ts.
    const toPaint = selectPaintedHighlightIds(highlights, me?.id ?? null);
    setPaintableCount(toPaint.size);
    if (!showHighlights) return; // reader chose a clean read — leave the prose bare (marks cleared above)
    for (const h of highlights) {
      if (!toPaint.has(h.id)) continue;
      // Precise span paint (single- or multi-block), using the stored block + char offsets so it hits
      // the right occurrence and crosses inline formatting; quote-search fallback if offsets drifted.
      wrapHighlight(root, h, { id: h.id, note: h.note, replyCount: h.replyCount });
    }
  }, [highlights, me?.id, showHighlights]);

  // Deep-link to a sentence: a `?hl=<quote>` from a path step / connection / discovery card scrolls to
  // the matching span and flashes it (mirrors the iOS postFocusQuote deep-link). Gated on the highlight
  // fetch having *settled* — not on there being any highlights — so a post with zero highlights still
  // resolves the quote via findQuoteTarget's plain-text fallback; a painted <mark> is preferred when one
  // exists (the paint pass runs first, so by the timeout the marks are in the DOM).
  useEffect(() => {
    if (!highlightsLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const quote = params.get("hl");
    if (!quote) return;
    // `?hl=…&thread=1` — coming from a surface that pointed AT the conversation (the feed's "답글 N"),
    // not just the sentence. Open that highlight's thread once, so the reader lands on the replies they
    // clicked toward rather than on the passage in the body. New links carry the highlight ID;
    // legacy quote-only links require an unambiguous match or offer a conversation chooser.
    const highlightId = Number(params.get("highlightId"));
    const exact = Number.isSafeInteger(highlightId) && highlightId > 0
      ? highlights.find((h) => h.id === highlightId) : undefined;
    const matches = highlights.filter((h) => h.quote === quote);
    const focused = exact ?? (matches.length === 1 ? matches[0] : undefined);
    if (params.get("thread") === "1") {
      if (focused) setThreadFor(focused);
      else if (matches.length > 1) setThreadChoices(matches);
    }
    // Retry on a short backoff instead of a single fixed delay: the paint pass and any late layout
    // (images settling, fonts) can push the mark in after the first tick — keep looking, then give up.
    // prefers-reduced-motion lands on the final state at once: instant jump, no smooth glide, no
    // color pulse (same contract as use-auto-slide's autoplay kill).
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const delays = [120, 400, 1000];
    let timer = 0;
    const attempt = (i: number) => {
      const root = document.querySelector<HTMLElement>(".prose-post");
      const target = root && findQuoteTarget(root, quote, focused);
      if (target) {
        target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        if (!reduceMotion) flashQuote(target);
        return;
      }
      if (i + 1 < delays.length) timer = window.setTimeout(() => attempt(i + 1), delays[i + 1]);
      else if (focused) {
        setThreadFor(focused);
        toast(t("highlightSourceUnavailable"));
      }
    };
    timer = window.setTimeout(() => attempt(0), delays[0]);
    return () => window.clearTimeout(timer);
    // Runs once per settle; `highlights` is read for the quote→thread match but is intentionally NOT a
    // dep — re-firing this scroll/open on every highlights refresh would yank the reader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightsLoaded]);

  // Tapping a painted highlight opens its reply thread (a plain click, not a drag-select — a drag
  // doesn't emit a click, so it stays out of the highlight-creation path). Enter/Space on a focused
  // mark does the same, so a keyboard reader reaches the thread the marks are `role="button"`.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".prose-post");
    if (!root) return;
    const openFromMark = (mark: HTMLElement | null) => {
      if (!mark) return false;
      const ids = highlightIdsForMark(mark);
      const choices = highlights.filter((h) => ids.includes(h.id));
      if (choices.length === 0) return false;
      if (choices.length === 1) setThreadFor(choices[0]);
      else setThreadChoices(choices);
      return true;
    };
    const markAt = (target: EventTarget | null) =>
      (target as HTMLElement | null)?.closest?.(`mark.${MARK_CLASS}[data-hl-id]`) as HTMLElement | null;
    const onClick = (e: MouseEvent) => {
      if (!window.getSelection()?.isCollapsed) return;
      if (openFromMark(markAt(e.target))) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (openFromMark(markAt(e.target))) e.preventDefault();
    };
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeyDown);
    };
  }, [highlights]);

  // Capture a selection inside the prose and offer the highlight actions at the selection. Finalize on
  // pointer release (works for both mouse and touch); a collapsed selection or a scroll dismisses the bar.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".prose-post");
    if (!root) return;

    const finalize = (e: Event) => {
      // Ignore releases on the action bar itself (tapping a button must not re-read / hide it).
      if (e.target instanceof Node && barRef.current?.contains(e.target)) return;
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.rangeCount > 0
        && root.contains(selection.getRangeAt(0).commonAncestorContainer)
        && selection.toString().trim().length > 1000) {
        setSel(null);
        toast(t("highlightSelectionTooLong"), "error");
        return;
      }
      const payload = readHighlightSelection(root);
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
    const onSelectionKeyUp = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)
        || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a")) finalize(event);
    };

    document.addEventListener("keyup", onSelectionKeyUp);
    document.addEventListener("mouseup", finalize);
    document.addEventListener("touchend", finalize);
    document.addEventListener("selectionchange", onSelectionChange);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("keyup", onSelectionKeyUp);
      document.removeEventListener("mouseup", finalize);
      document.removeEventListener("touchend", finalize);
      document.removeEventListener("selectionchange", onSelectionChange);
      window.removeEventListener("scroll", onScroll);
    };
  }, [t, toast]);

  // Create a highlight (bare or with a note) and confirm the outcome. The paint pass is the primary
  // "it landed" cue, but the mark can be off-screen (you selected, then the list re-pull repaints below
  // the fold) or fail to anchor on since-edited prose — so a brief toast tells you it saved either way.
  // On failure it says so instead of silently dropping the highlight (which read as "it worked").
  const persist = useCallback(
    async (payload: NewHighlight, okMessage: string) => {
      try {
        await createHighlight(postId, payload);
      } catch {
        toast(t("highlightSaveError"), "error");
        return false;
      }
      // A failed refresh must not turn a confirmed write into a retry/duplicate creation.
      try { setHighlights(await listHighlights(postId)); } catch { /* keep the last visible marks */ }
      toast(okMessage, "success");
      return true;
    },
    [postId, t, toast],
  );

  // After a reply is added/removed, re-pull so the painted marks reflect the new replyCount.
  const refreshHighlights = useCallback(async () => {
    try {
      setHighlights(await listHighlights(postId));
    } catch {
      /* keep the current set on a refresh failure */
    }
  }, [postId]);

  // Delete the viewer's own highlight — a hard cascade on the backend (the opener note + every reply go
  // with it). The thread sheet is z-60 and the shared confirm is z-50, so close the sheet first, then
  // raise the destructive confirm over the page. Optimistic: drop the highlight from state up front so
  // the paint effect unpaints its <mark> and recomputes the top-highlight clusters; restore + toast on
  // failure.
  const removeHighlight = useCallback(
    async (h: HighlightView) => {
      setThreadFor(null);
      const threaded = !!h.note?.trim() || h.replyCount > 0;
      const ok = await confirm({
        title: t("highlightDeleteConfirm"),
        description: threaded ? t("highlightDeleteConfirmBody") : t("highlightDeleteConfirmBodyBare"),
        destructive: true,
      });
      if (!ok) return;
      const prev = highlights;
      setHighlights((cur) => cur.filter((x) => x.id !== h.id));
      try {
        await deleteHighlight(h.id);
      } catch {
        setHighlights(prev);
        toast(t("highlightDeleteError"), "error");
      }
    },
    [confirm, highlights, t, toast],
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
    void persist(payload, t("highlightSaved"));
  }, [sel, authenticated, signInWithGoogle, persist, t]);

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
    async (note: string) => {
      if (!noteFor) return false;
      const trimmed = note.trim();
      const payload = { ...noteFor, note: trimmed || null };
      const saved = await persist(payload, trimmed ? t("highlightNoteSaved") : t("highlightSaved"));
      if (saved) setNoteFor(null);
      return saved;
    },
    [noteFor, persist, t],
  );

  // Two parts: (1) an in-flow, quiet toggle to hide/show the painted marks — rendered only when there
  // is at least one paintable highlight, so it never sits as a dead control on a bare post; (2) the
  // viewport-level overlays (selection bar + sheets), portaled to <body>. The overlays must render
  // against the viewport: the post body lives under `.post-enter`, whose hero-rise animation ends on
  // `transform: translateY(0)` (fill-mode both) and so keeps <article> a containing block for
  // `position: fixed` — portaling to <body> escapes that, so the backdrop/sheets pin to the screen and
  // not the 42rem reading column.
  return (
    <>
      {paintableCount > 0 && (
        <HighlightVisibilityToggle
          show={showHighlights}
          onToggle={toggleHighlights}
          shownLabel={t("highlightsShownCount", { count: paintableCount })}
          hiddenLabel={t("highlightsHidden")}
          hideLabel={t("highlightsHide")}
          showLabel={t("highlightsShow")}
        />
      )}
      {mounted &&
        createPortal(
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
              <HighlightNoteSheet
                quote={noteFor.quote}
                onCancel={() => setNoteFor(null)}
                onSave={saveNote}
              />
            )}
            {threadChoices.length > 0 && (
              <HighlightThreadChoices
                highlights={threadChoices}
                title={t("highlightChooseThread")}
                onClose={() => setThreadChoices([])}
                onChoose={(highlight) => { setThreadChoices([]); setThreadFor(highlight); }}
              />
            )}
            {threadFor && (
              <HighlightThread
                highlight={threadFor}
                meId={me?.id ?? null}
                authenticated={authenticated}
                onSignIn={signInWithGoogle}
                onClose={() => setThreadFor(null)}
                onChanged={refreshHighlights}
                onDelete={() => void removeHighlight(threadFor)}
              />
            )}
            {confirmDialog}
          </>,
          document.body,
        )}
    </>
  );
}

/**
 * A quiet in-flow control under the article body: "N개 밑줄" with a hide/show toggle. Lets a reader
 * read the post clean (no painted marks) without losing the ability to make their own — hiding only
 * stops the painting. Muted so it reads as a colophon-level affordance, not a button competing with the
 * post actions (§10). The count is the paintable set (the marks actually on the page).
 */
function HighlightVisibilityToggle({
  show,
  onToggle,
  shownLabel,
  hiddenLabel,
  hideLabel,
  showLabel,
}: {
  show: boolean;
  onToggle: () => void;
  shownLabel: string;
  hiddenLabel: string;
  hideLabel: string;
  showLabel: string;
}) {
  return (
    <div className="mt-8 flex items-center gap-2 text-[12px] text-slate-400 dark:text-slate-500">
      <Highlighter className="h-3.5 w-3.5 text-accent-600/70 dark:text-accent-500/70" aria-hidden />
      <span>{show ? shownLabel : hiddenLabel}</span>
      <span aria-hidden>·</span>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={!show}
        className="focus-ring rounded font-medium text-slate-500 underline-offset-2 transition-colors hover:text-accent-700 hover:underline dark:text-slate-400 dark:hover:text-accent-400"
      >
        {show ? hideLabel : showLabel}
      </button>
    </div>
  );
}

/** A shared painted span can carry several public conversations. Never guess which one was meant. */
function HighlightThreadChoices({ highlights, title, onClose, onChoose }: {
  highlights: HighlightView[];
  title: string;
  onClose: () => void;
  onChoose: (highlight: HighlightView) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("publicPost");
  useFocusTrap(contentRef, { active: true, onEscape: onClose });
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div ref={contentRef} role="dialog" aria-modal="true" aria-labelledby="highlight-choices-title" className="max-h-[80dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-slate-900 sm:max-w-md sm:rounded-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <h3 id="highlight-choices-title" className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {highlights.map((highlight) => (
            <li key={highlight.id}>
              <button type="button" className="focus-ring w-full rounded-lg py-3 text-left" onClick={() => onChoose(highlight)}>
                <span className="block text-[13px] font-medium text-slate-900 dark:text-slate-100">@{highlight.author?.username ?? "?"}</span>
                <span className="mt-1 block line-clamp-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">{highlight.note || highlight.quote}</span>
                {highlight.replyCount > 0 && <span className="mt-1 block text-[12px] text-slate-500 dark:text-slate-400">{t("highlightReplyCount", { count: highlight.replyCount })}</span>}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={onClose} className="focus-ring mt-3 rounded-lg px-3.5 py-2 text-sm text-slate-600 dark:text-slate-300">{t("highlightNoteCancel")}</button>
      </div>
    </div>
  );
}

/**
 * The reply thread on a highlight (Are.na-style margin conversation): the quoted passage + the
 * curator's note (the opener) + a flat list of replies + a composer. A bottom sheet on mobile (lifted
 * above the keyboard) / centered card on desktop, matching {@link NoteSheet}. Reuses the comment
 * markdown renderer + composer so a reply reads and writes exactly like a comment.
 */
function HighlightThread({
  highlight,
  meId,
  authenticated,
  onSignIn,
  onClose,
  onChanged,
  onDelete,
}: {
  highlight: HighlightView;
  meId: number | null;
  authenticated: boolean;
  onSignIn: () => void;
  onClose: () => void;
  onChanged: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("publicPost");
  const tc = useTranslations("collections");
  const locale = useLocale();
  const [replies, setReplies] = useState<HighlightReplyView[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The reply the viewer just posted — after it renders, scroll it into view so a new reply added from
  // the bottom composer doesn't land below the fold. Cleared once scrolled (a ref, so it doesn't
  // re-trigger on later renders). A load re-fetch never sets this, so only a just-posted reply scrolls.
  const justPostedIdRef = useRef<number | null>(null);
  const repliesEndRef = useRef<HTMLDivElement>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  // The public paths/collections this sentence is woven into ("이 문장이 속한 길" — A-척추 discovery loop).
  const [inCollections, setInCollections] = useState<CollectionSummary[]>([]);
  // Blocks curators wove alongside this sentence in the same public collections ("이것과 이어진 것").
  const [related, setRelated] = useState<RelatedBlock[]>([]);
  // When true, the connect sheet is open over the thread (file this sentence into a collection / path).
  const [connecting, setConnecting] = useState(false);
  const inset = useKeyboardInset();
  const contentRef = useRef<HTMLDivElement>(null);
  // Connect needs a server-side highlight (positive id); an optimistic one (negative id) has no refId.
  const canConnect = authenticated && highlight.id > 0;
  // The delete affordance is owner-only — the viewer's own highlight (same gate as the per-reply delete).
  const isMine = meId != null && highlight.author?.id === meId;

  // Keyboard containment: Escape + Tab cycling + focus restore. Goes inert while the ConnectSheet is
  // open over the thread so the two traps don't fight over Tab (ConnectSheet runs its own then).
  useFocusTrap(contentRef, { active: !connecting, onEscape: onClose });

  const load = useCallback(() => {
    listHighlightReplies(highlight.id)
      .then(setReplies)
      .catch(() => setReplies([]));
  }, [highlight.id]);

  const loadContaining = useCallback(() => {
    if (highlight.id <= 0) return;
    listCollectionsContainingHighlight(highlight.id)
      .then(setInCollections)
      .catch(() => setInCollections([]));
    listRelatedBlocks("HIGHLIGHT", highlight.id)
      .then(setRelated)
      .catch(() => setRelated([]));
  }, [highlight.id]);

  useEffect(() => {
    load();
    loadContaining();
  }, [load, loadContaining]);

  // After a just-posted reply renders, bring it into view. Only fires when submit() armed the ref, so a
  // background re-load never yanks the scroll. Scrolls the thread's own container (not the page) to the
  // reply-list end so the newest reply sits at the bottom of the list — the "이 문장이 속한 길"/"이어진
  // 것" sections that follow it in the same scroller stay below. Honors reduced-motion (instant jump).
  useEffect(() => {
    if (justPostedIdRef.current == null) return;
    justPostedIdRef.current = null;
    const scroller = threadScrollRef.current;
    const end = repliesEndRef.current;
    if (!scroller || !end) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Target: the reply-list end (sentinel) aligned to the bottom of the visible scroller. Rect-based so
    // it's independent of offsetParent — how far to move = sentinel's bottom minus the scroller's bottom.
    const delta = end.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom;
    if (delta <= 0) return; // already visible — don't jump
    scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: reduce ? "auto" : "smooth" });
  }, [replies]);

  async function submit() {
    if (!authenticated) {
      onSignIn();
      return;
    }
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Optimistic append with the created reply — a re-fetch (listHighlightReplies) returns [] on a
      // read failure, which would blank the whole thread on an otherwise-successful post.
      const created = await createHighlightReply(highlight.id, body.trim());
      setReplies((prev) => [...prev, created]);
      setBody("");
      // Scroll the just-posted reply into view once it renders — from the bottom composer a new reply
      // otherwise lands below the fold (the scroll area doesn't move on append). The effect below reads
      // this ref after the list re-renders. The composer keeps focus so a follow-up reply flows.
      justPostedIdRef.current = created.id;
      onChanged(); // refresh the marks' replyCount
    } catch {
      setError(t("replyError"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    setError(null);
    try {
      await deleteHighlightReply(id);
      setReplies((prev) => prev.filter((r) => r.id !== id));
      onChanged();
    } catch {
      setError(t("replyError"));
    } finally {
      setBusy(false);
    }
  }

  // Same shape as the comment section's date (year included) — the thread reads like comments.
  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Seoul",
    });
  }

  return (
    <>
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4"
      style={{ paddingBottom: inset }}
      onMouseDown={onClose}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hl-thread-quote"
        className="flex max-h-[80vh] w-full flex-col rounded-t-2xl bg-white shadow-xl dark:bg-slate-900 sm:max-w-md sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <blockquote id="hl-thread-quote" className="line-clamp-3 flex-1 border-l-2 border-accent-600 pl-3 text-[13px] leading-relaxed text-slate-500 dark:border-accent-500/40 dark:text-slate-400">
              {highlight.quote}
            </blockquote>
            {(canConnect || isMine) && (
              <div className="-mr-1 -mt-1 flex shrink-0 items-center gap-0.5">
                {/* Connect this sentence into a collection / path — the entry into the connection graph. */}
                {canConnect && (
                  <button
                    type="button"
                    onClick={() => setConnecting(true)}
                    aria-label={tc("connectThisSentence")}
                    title={tc("connectThisSentence")}
                    className="focus-ring shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-accent-700 dark:hover:bg-slate-800 dark:hover:text-accent-400"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </button>
                )}
                {/* Owner-only: delete this highlight (a hard cascade — its note + every reply). Confirms first. */}
                {isMine && (
                  <button
                    type="button"
                    onClick={onDelete}
                    aria-label={t("highlightDelete")}
                    title={t("highlightDelete")}
                    className="focus-ring shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
          {/* The opener: who drew the highlight, when — always shown (a bare highlight included, which
              used to render as an anonymous quote), in the same avatar + @handle + date row grammar as
              the comment section and the replies below. The curator's note, if any, sits under it. */}
          <div className="mt-3 flex items-center gap-2">
            {highlight.author?.username ? (
              <BlogLink
                href={authorHref(highlight.author.username, locale)}
                className="group/author flex min-w-0 items-center gap-2 rounded focus-ring"
              >
                <Avatar
                  src={highlight.author.avatarUrl}
                  name={highlight.author.username}
                  size="sm"
                  shrink={false}
                />
                <span className="truncate text-[13px] font-medium text-slate-900 transition-colors group-hover/author:text-accent-700 dark:text-slate-100 dark:group-hover/author:text-accent-400">
                  @{highlight.author.username}
                </span>
              </BlogLink>
            ) : (
              <span className="flex min-w-0 items-center gap-2">
                <Avatar src={null} name="?" size="sm" shrink={false} />
                <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">@?</span>
              </span>
            )}
            <span className="shrink-0 text-[12px] text-slate-500 dark:text-slate-400">
              {fmt(highlight.createdAt)}
            </span>
          </div>
          {highlight.note && (
            <div className="mt-1.5 min-w-0 pl-9 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
              <CommentBody text={highlight.note} locale={locale} />
            </div>
          )}
        </div>

        <div ref={threadScrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {replies.length === 0 ? (
            // 답글이 아직 없음 — 하이라이트는 이미 위(따옴표+작성자)에 있으므로, 이 자리는 "답글이 없다"만
            // 조용히 말한다. 예전 "첫 답글을 남겨보세요"는 큰 중앙 블록이라 "여기 비어 있다/하이라이트 없다"
            // 로 오독됐다(사장님 신고) — 왼쪽 정렬 muted 한 줄로 낮춰 답글에 한정된 상태임을 분명히 한다.
            <p className="text-[13px] text-slate-400 dark:text-slate-500">
              {t("highlightThreadNoReplies")}
            </p>
          ) : (
            <ul className="space-y-4">
              {replies.map((r) => (
                <li key={r.id}>
                  {/* Same row grammar as the opener/comments: avatar + @handle + date. */}
                  <div className="flex items-center gap-2">
                    {r.author?.username ? (
                      <BlogLink
                        href={authorHref(r.author.username, locale)}
                        className="group/author flex min-w-0 items-center gap-2 rounded focus-ring"
                      >
                        <Avatar
                          src={r.author.avatarUrl}
                          name={r.author.username}
                          size="sm"
                          shrink={false}
                        />
                        <span className="truncate text-[13px] font-medium text-slate-900 transition-colors group-hover/author:text-accent-700 dark:text-slate-100 dark:group-hover/author:text-accent-400">
                          @{r.author.username}
                        </span>
                      </BlogLink>
                    ) : (
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar src={null} name="?" size="sm" shrink={false} />
                        <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
                          @?
                        </span>
                      </span>
                    )}
                    <span className="shrink-0 text-[12px] text-slate-500">{fmt(r.createdAt)}</span>
                    {meId != null && r.author?.id === meId && (
                      <button
                        type="button"
                        onClick={() => void remove(r.id)}
                        className="touch-target ml-auto rounded text-[12px] text-slate-400 transition-colors hover:text-red-500 focus-ring"
                      >
                        {t("highlightReplyDelete")}
                      </button>
                    )}
                  </div>
                  <div className="mt-1 min-w-0 pl-9 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
                    <CommentBody text={r.body} locale={locale} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {/* Scroll anchor for a just-posted reply — sits right after the list so scrolling it into view
              lands on the newest reply (see the submit scroll effect). */}
          <div ref={repliesEndRef} aria-hidden />

          {/* 이 문장이 속한 길 — from one sentence to the paths/collections it's woven into. */}
          {inCollections.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-500">
                {tc("inPathTitle")}
              </p>
              <ul className="mt-2 space-y-1">
                {inCollections.map((c) => (
                  <li key={c.id}>
                    <BlogLink
                      href={blogPath(`/collections/${c.id}`)}
                      className="focus-ring flex items-center gap-2 rounded-lg px-1 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {c.kind === "PATH" ? (
                        <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-accent-600 dark:text-accent-500" />
                      ) : (
                        <ContainingGlyph visibility={c.visibility} />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[14px] text-slate-800 dark:text-slate-200">
                        {c.title}
                      </span>
                      <span className="shrink-0 text-[12px] text-slate-500 dark:text-slate-500">
                        {c.count}
                      </span>
                    </BlogLink>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 이것과 이어진 것 — other blocks curators wove alongside this sentence (co-occurrence hop). */}
          {related.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-500">
                {tc("relatedBlocksTitle")}
              </p>
              <ul className="mt-3 space-y-3">
                {related.map((b) => (
                  <li key={`${b.blockType}-${b.refId}`}>
                    <ConnectionBlock block={b} locale={locale} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <CommentComposer
            value={body}
            onChange={setBody}
            onSubmit={() => void submit()}
            placeholder={t("highlightReplyPlaceholder")}
            submitLabel={t("highlightReplySubmit")}
            submitting={busy}
            canSubmit={!authenticated || !!body.trim()}
            rows={2}
            compact
            hideToolbar
            footer={authenticated ? "" : t("highlightReplyLogin")}
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
    {connecting && (
      <ConnectSheet
        blockType="HIGHLIGHT"
        refId={highlight.id}
        targetLabel={tc("blockHighlight")}
        targetTitle={highlight.quote}
        onClose={() => setConnecting(false)}
        onDone={() => {
          setConnecting(false);
          loadContaining();
        }}
      />
    )}
    </>
  );
}

/** A small glyph for a containing collection's visibility (paths use the path arrow instead). */
function ContainingGlyph({ visibility }: { visibility: CollectionSummary["visibility"] }) {
  const cls = "h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500";
  if (visibility === "PUBLIC") return <Globe className={cls} />;
  if (visibility === "UNLISTED") return <LinkIcon className={cls} />;
  return <Lock className={cls} />;
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
    // Outer node carries ONLY the viewport-positioning transform; the inner pill owns the entrance
    // animation, so an animated transform never overrides the left/top anchoring.
    <div
      ref={innerRef}
      className="fixed z-50"
      style={{
        left,
        top: above ? anchor.top - 12 : anchor.bottom + 12,
        transform: `translateX(-50%)${above ? " translateY(-100%)" : ""}`,
      }}
    >
      <div
        role="toolbar"
        // Keep the text selection alive through the click so it doesn't visibly collapse mid-tap.
        onMouseDown={(e) => e.preventDefault()}
        className="flex animate-fade-in items-center gap-0.5 rounded-full bg-slate-900 p-1 text-[13px] font-medium text-white shadow-[0_10px_34px_-12px_rgba(2,6,23,0.7)] ring-1 ring-white/10 dark:bg-white dark:text-slate-900 dark:ring-slate-900/10"
      >
        <button
          type="button"
          onClick={onHighlight}
          className="focus-ring flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors hover:bg-white/10 dark:hover:bg-slate-900/10"
        >
          {/* Green tie to the painted mark — the icon previews what the action leaves behind. */}
          <Highlighter className="h-3.5 w-3.5 text-accent-400 dark:text-accent-600" />
          {highlightLabel}
        </button>
        <button
          type="button"
          onClick={onNote}
          className="focus-ring flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors hover:bg-white/10 dark:hover:bg-slate-900/10"
        >
          <PenLine className="h-3.5 w-3.5 text-accent-400 dark:text-accent-600" />
          {noteLabel}
        </button>
      </div>
    </div>
  );
}

/** Briefly settle a soft green over a deep-linked target so the eye lands on it (mirrors the iOS focus
 *  blink). Toned to match the document-quiet highlight tint (not a felt-pen flash): light rises to a
 *  gentle accent-600 @ 0.20, dark to a brighter accent-500 @ 0.28 — accent-600 sinks into a dark page. */
function flashQuote(el: HTMLElement) {
  el.style.transition = "background-color 0.4s ease";
  const prev = el.style.backgroundColor;
  const dark = document.documentElement.classList.contains("dark");
  el.style.backgroundColor = dark ? "rgba(16,185,129,0.28)" : "rgba(5,150,105,0.20)";
  window.setTimeout(() => {
    el.style.backgroundColor = prev;
  }, 1100);
}
