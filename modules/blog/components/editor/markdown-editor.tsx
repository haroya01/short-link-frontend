"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  SquareCode,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Video,
  type LucideIcon,
} from "lucide-react";
import { CodeMirrorBlock, insertCodeBlock } from "@/modules/blog/components/editor/codemirror-block";
import { LinkCardNode, LINK_CARD_URL_RE } from "@/modules/blog/components/editor/link-card-node";
import { EditorBlockHandle } from "@/modules/blog/components/editor/editor-block-handle";
import { SlashMenu } from "@/modules/blog/components/editor/tiptap-slash-menu";
import { UrlDialog } from "@/modules/blog/components/editor/url-dialog";
import {
  PlaceSearchDialog,
  mapsPlaceUrl,
  type PickedPlace,
} from "@/modules/blog/components/editor/place-search-dialog";
import { altWithWidth, type ImageWidth } from "@/modules/blog/lib/image-width";

/** Options for opening the image picker: a width (wide/full/half) and whether to allow multi-select
 *  (for a side-by-side "half" pair). Carried to the file-input change handler via a ref. */
export type ImagePickOptions = { width?: ImageWidth; multiple?: boolean };

/**
 * Typewriter scrolling — keep the caret from sinking into the bottom of the editor while you write.
 * When the caret's bottom drops past the 2/3 line of the scroll container, nudge the container down
 * by the overflow so the active line settles at ~2/3 height (always ~1/3 of room below it). Only
 * scrolls DOWN (caret too low); a caret higher up is left alone, so clicking near the top — or
 * editing the first few lines — never yanks the view.
 */
function keepCaretInView(editor: Editor, scroller: HTMLElement | null) {
  if (!scroller) return;
  // Reduced-motion: skip the typewriter re-positioning and let the browser's native caret scrolling
  // keep it visible — the constant auto-scroll-as-you-type is exactly the motion these users opt out of.
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  let coords: { bottom: number };
  try {
    coords = editor.view.coordsAtPos(editor.state.selection.head);
  } catch {
    return;
  }
  const rect = scroller.getBoundingClientRect();
  const overflow = coords.bottom - (rect.top + rect.height * (2 / 3));
  if (overflow > 0) scroller.scrollTop += overflow;
}

/**
 * Coalesce the typewriter-scroll measurement to one rAF. Each keystroke fires BOTH onUpdate and
 * onSelectionUpdate, and a fast typist emits several per frame — running keepCaretInView on each
 * forces a synchronous layout (coordsAtPos + getBoundingClientRect) every time. Scheduling through a
 * single rAF collapses a burst into one layout read per frame.
 */
function scheduleKeepCaret(
  rafRef: { current: number | undefined },
  editor: Editor,
  scrollerRef: { current: HTMLElement | null },
) {
  if (rafRef.current != null) return;
  rafRef.current = window.requestAnimationFrame(() => {
    rafRef.current = undefined;
    keepCaretInView(editor, scrollerRef.current);
  });
}

/**
 * Inflearn/Notion-style Enter: inside a plain top-level paragraph, a single Enter is a SOFT line
 * break (tight — same paragraph, just line-height), and a second Enter on that empty break-line
 * promotes to a NEW paragraph (the wider inter-paragraph gap). This keeps casual line breaks tight
 * while real paragraph separation stays as-is.
 *
 * Scoped to depth-1 paragraphs only — headings, list items, and quotes keep their native Enter
 * (exit heading / new list item / etc.), so markdown shortcuts (`## `, `- `, `---`) still work at
 * the start of a fresh paragraph. Soft breaks serialize as `\n` within one PARAGRAPH block (the
 * markdown↔blocks path already coalesces them; the reader renders them via `breaks:true`).
 */
const EnterSoftBreak = Extension.create({
  name: "enterSoftBreak",
  // Run before StarterKit's default Enter; returning false falls through to native handlers.
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { selection } = this.editor.state;
        const { $from, empty } = selection;
        if (!empty) return false;
        // Only plain top-level paragraphs — lists/quotes/headings keep their own Enter.
        if ($from.depth !== 1 || $from.parent.type.name !== "paragraph") return false;
        const before = $from.nodeBefore;
        // Second Enter (caret right after a soft break) → drop the break, split into a new paragraph.
        if (before?.type.name === "hardBreak") {
          return this.editor
            .chain()
            .command(({ tr }) => {
              tr.delete($from.pos - before.nodeSize, $from.pos);
              return true;
            })
            .splitBlock()
            .run();
        }
        // Empty paragraph → let the default Enter make a new paragraph.
        if ($from.parent.content.size === 0) return false;
        // Otherwise: a tight soft line break within the same paragraph.
        return this.editor.commands.setHardBreak();
      },
    };
  },
});

/**
 * Long-form post editor — Tiptap (ProseMirror) with a CodeMirror code-block node (language-aware
 * highlight + auto-indent). Content round-trips as markdown via tiptap-markdown, so the existing
 * markdown↔blocks save path is unchanged. Replaces the previous Toast UI editor.
 */
export function MarkdownEditor({
  initialValue,
  onChange,
  onUploadImage,
  onUploadError,
  liveMarkdownRef,
}: {
  initialValue: string;
  onChange: (markdown: string) => void;
  onUploadImage: (file: Blob) => Promise<string>;
  onUploadError?: (message: string) => void;
  // Exposes a synchronous "serialize the doc to markdown right now" getter to the parent, so Save/
  // Publish can read the LATEST content instead of the debounced onChange state.
  liveMarkdownRef?: { current: (() => string) | null };
}) {
  const t = useTranslations("postEditor");
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingWidth = useRef<ImageWidth | undefined>(undefined);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const caretRaf = useRef<number | undefined>(undefined);
  const [placeOpen, setPlaceOpen] = useState(false);
  // Serializing the whole doc to markdown (+ a parent setState) on EVERY keystroke freezes typing on
  // long posts. Debounce it (~250ms after you stop) and flush on blur so save/publish never misses the
  // last edit. onChangeRef keeps the latest callback without re-creating the editor.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const flushTimer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(flushTimer.current);
      if (caretRaf.current != null) window.cancelAnimationFrame(caretRaf.current);
    },
    [],
  );
  // In-app URL prompt (link / embed) instead of window.prompt.
  const [urlDialog, setUrlDialog] = useState<{ mode: "link" | "embed"; initial: string } | null>(null);

  // Open the file picker with a target width; "half" + multiple lets you pick 2 for a side-by-side row.
  function pickImage(opts: ImagePickOptions = {}) {
    pendingWidth.current = opts.width;
    if (fileRef.current) {
      fileRef.current.multiple = !!opts.multiple;
      fileRef.current.click();
    }
  }

  async function uploadAndInsert(ed: Editor, file: File, width?: ImageWidth) {
    try {
      const url = await onUploadImage(file);
      // Width rides on the alt marker so it survives markdown↔block round-trip (image-width.ts).
      ed.chain().focus().setImage({ src: url, alt: altWithWidth(file.name, width) }).run();
    } catch (e) {
      onUploadError?.(e instanceof Error ? e.message : "image upload failed");
    }
  }

  // Insert several images in order. setImage leaves each inserted image SELECTED (a NodeSelection), so
  // collapse the caret to just after it before the next insert — otherwise the second setImage replaces
  // the first and only one survives (drop / paste / multi-pick all hit this).
  async function uploadAndInsertMany(ed: Editor, files: File[], width?: ImageWidth) {
    for (const f of files) {
      await uploadAndInsert(ed, f, width);
      ed.commands.setTextSelection(ed.state.selection.to);
    }
  }

  const editor = useEditor({
    // Next SSR: Tiptap must not render on the server (hydration mismatch otherwise).
    immediatelyRender: false,
    extensions: [
      // codeBlock off → our CodeMirror block; link openOnClick off so clicking a link in the editor
      // places the cursor instead of opening a tab.
      StarterKit.configure({
        codeBlock: false,
        // Only H1–H3 exist in the block model (markdownToBlocks matches `#{1,3}`). Without this,
        // typing `#### ` makes a real h4 node that serializes to `#### text` and round-trips as a
        // literal-text PARAGRAPH — the heading (and its TOC entry) silently lost.
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, enableClickSelection: true },
      }),
      EnterSoftBreak,
      CodeMirrorBlock,
      LinkCardNode,
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      // Show a hint on the empty body so it's obvious where to start writing (CSS at .tiptap
      // p.is-editor-empty::before renders this).
      Placeholder.configure({ placeholder: t("bodyPlaceholder") }),
      // html:false — standard markdown only (no raw-HTML passthrough); GFM tables round-trip natively.
      Markdown.configure({ html: false, breaks: true, transformPastedText: true }),
    ],
    content: initialValue || "",
    editorProps: {
      attributes: { class: "tiptap focus:outline-none" },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items || !editor) return false;
        // ALL pasted images, not just the first — pasting a 2-up screenshot batch dropped the rest.
        const imageFiles = Array.from(items)
          .filter((it) => it.type.startsWith("image/"))
          .map((it) => it.getAsFile())
          .filter((f): f is File => !!f);
        if (imageFiles.length) {
          event.preventDefault();
          void uploadAndInsertMany(editor, imageFiles);
          return true;
        }
        // A bare URL pasted onto an empty line → a live link-preview card (velog/Notion). Pasting a
        // URL over text or into a non-empty line stays a normal link (default behaviour).
        const text = event.clipboardData?.getData("text/plain")?.trim();
        if (text && LINK_CARD_URL_RE.test(text)) {
          const { $from, empty } = editor.state.selection;
          const para = $from.parent;
          if (empty && para.type.name === "paragraph" && para.content.size === 0) {
            event.preventDefault();
            editor.chain().focus().insertContent({ type: "linkCard", attrs: { url: text } }).run();
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = (event as DragEvent).dataTransfer?.files;
        if (!files || files.length === 0 || !editor) return false;
        const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (imgs.length === 0) return false;
        event.preventDefault();
        // Land the image WHERE it was dropped (posAtCoords), not at the stale caret (usually doc end),
        // and insert ALL dropped images, not just the first.
        const at = view.posAtCoords({ left: (event as DragEvent).clientX, top: (event as DragEvent).clientY });
        if (at) editor.commands.setTextSelection(at.pos);
        void uploadAndInsertMany(editor, imgs);
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      scheduleKeepCaret(caretRaf, editor, scrollerRef);
      window.clearTimeout(flushTimer.current);
      flushTimer.current = window.setTimeout(() => {
        // tiptap-markdown augments storage at runtime but ships no type for it.
        const md = (editor.storage as { markdown?: { getMarkdown: () => string } }).markdown;
        if (md) onChangeRef.current(md.getMarkdown());
      }, 250);
    },
    onSelectionUpdate: ({ editor }) => {
      scheduleKeepCaret(caretRaf, editor, scrollerRef);
    },
    onBlur: ({ editor }) => {
      window.clearTimeout(flushTimer.current);
      const md = (editor.storage as { markdown?: { getMarkdown: () => string } }).markdown;
      if (md) onChangeRef.current(md.getMarkdown());
    },
  });

  // Register the synchronous markdown getter for the parent's Save/Publish path (must run before the
  // early return so the hook order is stable).
  useEffect(() => {
    if (!liveMarkdownRef) return;
    liveMarkdownRef.current = () =>
      (editor?.storage as { markdown?: { getMarkdown: () => string } } | undefined)?.markdown?.getMarkdown() ??
      "";
    return () => {
      if (liveMarkdownRef) liveMarkdownRef.current = null;
    };
  }, [editor, liveMarkdownRef]);

  if (!editor) return <div className="h-full" />;

  return (
    <div className="flex h-full flex-col">
      <BubbleBar editor={editor} onEditLink={(href) => setUrlDialog({ mode: "link", initial: href })} />
      <TableMenu editor={editor} />
      <EditorBlockHandle editor={editor} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          const width = pendingWidth.current;
          e.target.value = "";
          await uploadAndInsertMany(editor, files, width);
        }}
      />
      {/* Always-on top toolbar — the resting-state affordance so every tool (굵게·표·…) is visible
          without selecting text or knowing `/`. Sits above the scrolling body so it never scrolls away;
          the selection bubble + floating insert bar still work as contextual shortcuts. */}
      <EditorToolbar
        editor={editor}
        onEditLink={(href) => setUrlDialog({ mode: "link", initial: href })}
        onPickImage={pickImage}
        onPickEmbed={() => setUrlDialog({ mode: "embed", initial: "" })}
      />
      {/* px-5 matches the page's px-5 so the body text lines up with the title above (the wrapper
          breaks out of that padding with -mx-5 to let «wide»/«full» images bleed wider than the text). */}
      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <EditorContent editor={editor} className="h-full" />
      </div>
      <SlashMenu
        editor={editor}
        onPickImage={pickImage}
        onPickPlace={() => setPlaceOpen(true)}
        onPickEmbed={() => setUrlDialog({ mode: "embed", initial: "" })}
      />
      <PlaceSearchDialog
        open={placeOpen}
        onClose={() => setPlaceOpen(false)}
        onPick={(place: PickedPlace) => {
          // Insert the canonical Google Maps place URL on its own line → markdownToBlocks turns it
          // into an EMBED block → the reader draws it as a static-map card.
          editor.chain().focus().insertContent(`\n${mapsPlaceUrl(place)}\n`).run();
        }}
      />
      <UrlDialog
        open={!!urlDialog}
        title={urlDialog?.mode === "embed" ? t("urlDialog.embedTitle") : t("urlDialog.linkTitle")}
        placeholder={urlDialog?.mode === "embed" ? t("urlDialog.embedPlaceholder") : t("urlDialog.linkPlaceholder")}
        initialValue={urlDialog?.initial ?? ""}
        allowRemove={urlDialog?.mode === "link" && !!urlDialog.initial}
        onClose={() => setUrlDialog(null)}
        onSubmit={(url) => {
          if (urlDialog?.mode === "embed") {
            // Insert a live link-preview card node (serializes back to the bare URL → EMBED block).
            editor.chain().focus().insertContent({ type: "linkCard", attrs: { url } }).run();
          } else {
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }
        }}
        onRemove={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
      />
    </div>
  );
}

/**
 * Always-on top toolbar. Readers asked for a resting-state toolbar so every tool is visible without
 * selecting text or knowing the `/` menu / shift+enter — text marks, headings, lists, quote, code,
 * divider, and the inserts (image · table · embed), each reflecting its active state live (Tiptap v3
 * useEditor doesn't re-render on transactions → useEditorState). Block labels reuse the localized
 * slash.* strings; commands mirror the bubble / floating bars. `onMouseDown`+preventDefault keeps the
 * selection/caret from collapsing before the command runs (so Link + mark toggles work).
 */
function EditorToolbar({
  editor,
  onEditLink,
  onPickImage,
  onPickEmbed,
}: {
  editor: Editor;
  onEditLink: (href: string) => void;
  onPickImage: (opts?: ImagePickOptions) => void;
  onPickEmbed: () => void;
}) {
  const t = useTranslations("postEditor");
  const a = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      strike: editor.isActive("strike"),
      code: editor.isActive("code"),
      link: editor.isActive("link"),
      h1: editor.isActive("heading", { level: 1 }),
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      bullet: editor.isActive("bulletList"),
      ordered: editor.isActive("orderedList"),
      quote: editor.isActive("blockquote"),
      codeBlock: editor.isActive("codeBlock"),
    }),
  });
  const setLink = () => onEditLink((editor.getAttributes("link").href as string | undefined) ?? "");

  type Item = { icon: LucideIcon; label: string; active?: boolean; run: () => void };
  const groups: Item[][] = [
    [
      { icon: Bold, label: t("toolbar.bold"), active: a.bold, run: () => editor.chain().focus().toggleBold().run() },
      { icon: Italic, label: t("toolbar.italic"), active: a.italic, run: () => editor.chain().focus().toggleItalic().run() },
      { icon: Strikethrough, label: t("toolbar.strike"), active: a.strike, run: () => editor.chain().focus().toggleStrike().run() },
      { icon: Code2, label: t("toolbar.inlineCode"), active: a.code, run: () => editor.chain().focus().toggleCode().run() },
      { icon: LinkIcon, label: t("toolbar.link"), active: a.link, run: setLink },
    ],
    [
      { icon: Heading1, label: t("slash.heading1"), active: a.h1, run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
      { icon: Heading2, label: t("slash.heading2"), active: a.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
      { icon: Heading3, label: t("slash.heading3"), active: a.h3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
      { icon: List, label: t("slash.bulletList"), active: a.bullet, run: () => editor.chain().focus().toggleBulletList().run() },
      { icon: ListOrdered, label: t("slash.orderedList"), active: a.ordered, run: () => editor.chain().focus().toggleOrderedList().run() },
      { icon: Quote, label: t("slash.quote"), active: a.quote, run: () => editor.chain().focus().toggleBlockquote().run() },
      { icon: SquareCode, label: t("slash.codeBlock"), active: a.codeBlock, run: () => insertCodeBlock(editor) },
    ],
    [
      { icon: ImageIcon, label: t("slash.image"), run: () => onPickImage() },
      { icon: TableIcon, label: t("slash.table"), run: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
      { icon: Video, label: t("slash.embed"), run: onPickEmbed },
      { icon: Minus, label: t("slash.divider"), run: () => editor.chain().focus().setHorizontalRule().run() },
    ],
  ];

  const cls = (active?: boolean) =>
    `touch-target focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors ${
      active
        ? "bg-accent-50 text-accent-700 dark:bg-accent-500/20 dark:text-accent-300"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    }`;

  return (
    <div className="relative border-b border-slate-100 dark:border-slate-800">
      <div
        data-testid="editor-toolbar"
        className="flex items-center gap-0.5 overflow-x-auto px-5 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {groups.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && <span className="mx-1 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" aria-hidden />}
            {group.map((it, i) => (
              <button
                key={i}
                type="button"
                aria-label={it.label}
                title={it.label}
                aria-pressed={it.active}
                className={cls(it.active)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  it.run();
                }}
              >
                <it.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        ))}
      </div>
      {/* Right-edge fade — signals the toolbar scrolls horizontally where it can't fit (390px crops the
          trailing groups). Same scroll-fade idiom as the discovery rail; sm+ the toolbar fits, so the
          hint hides. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent dark:from-slate-950 sm:hidden" />
    </div>
  );
}

/**
 * Selection bubble — a contextual formatting shortcut over a text selection (the always-on toolbar
 * above covers discovery). Shows the inline marks; block insertion also lives in the slash (`/`) menu
 * and markdown input rules (`## `, `> `, `- `, ``` ```).
 */
function BubbleBar({ editor, onEditLink }: { editor: Editor; onEditLink: (href: string) => void }) {
  const t = useTranslations("postEditor");
  const btn = (active: boolean) =>
    `touch-target focus-ring grid h-8 w-8 place-items-center rounded-md transition-colors ${
      active
        ? "bg-accent-50 text-accent-700 dark:bg-accent-500/20 dark:text-accent-300"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    }`;

  const setLink = () => onEditLink((editor.getAttributes("link").href as string | undefined) ?? "");

  // Tiptap v3's useEditor does NOT re-render on transactions, so reading editor.isActive(...) inline
  // would freeze the buttons' active highlight at their mount value. Subscribe via useEditorState so
  // each toggle reflects immediately (this is what made the empty-line "굵게 쓰기" feel dead).
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      strike: editor.isActive("strike"),
      code: editor.isActive("code"),
      link: editor.isActive("link"),
    }),
  });

  const items = [
    { icon: Bold, label: t("toolbar.bold"), active: active.bold, run: () => editor.chain().focus().toggleBold().run() },
    { icon: Italic, label: t("toolbar.italic"), active: active.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { icon: Strikethrough, label: t("toolbar.strike"), active: active.strike, run: () => editor.chain().focus().toggleStrike().run() },
    { icon: Code2, label: t("toolbar.inlineCode"), active: active.code, run: () => editor.chain().focus().toggleCode().run() },
    { icon: LinkIcon, label: t("toolbar.link"), active: active.link, run: setLink },
  ];

  return (
    <BubbleMenu editor={editor}>
      {/* Inner div carries the chrome + a testid so tests target the bubble's marks, not the
          identically-labelled always-on toolbar buttons. */}
      <div
        data-testid="bubble-bar"
        className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
      >
        {items.map((it, i) => (
          <button
            key={i}
            type="button"
            aria-label={it.label}
            aria-pressed={it.active}
            className={btn(it.active)}
            // onMouseDown + preventDefault (like the toolbar) so clicking doesn't blur the editor
            // and collapse the selection before the command runs — a collapsed selection makes Link in
            // particular a no-op (extendMarkRange finds no range), and weakens the mark toggles.
            onMouseDown={(e) => {
              e.preventDefault();
              it.run();
            }}
          >
            <it.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </BubbleMenu>
  );
}

/**
 * Table controls — a small toolbar that appears above the table while the caret is inside one (and no
 * text is selected, so it never collides with the selection BubbleBar). Answers "how do I grow a 3×3?":
 * add/remove columns + rows, or drop the whole table. Tiptap's table commands do the work.
 */
function TableMenu({ editor }: { editor: Editor }) {
  const t = useTranslations("postEditor.table");
  const items = [
    { icon: Plus, label: t("addColumn"), run: () => editor.chain().focus().addColumnAfter().run() },
    { icon: Plus, label: t("addRow"), run: () => editor.chain().focus().addRowAfter().run() },
    { icon: Minus, label: t("deleteColumn"), run: () => editor.chain().focus().deleteColumn().run() },
    { icon: Minus, label: t("deleteRow"), run: () => editor.chain().focus().deleteRow().run() },
    { icon: Trash2, label: t("deleteTable"), run: () => editor.chain().focus().deleteTable().run(), danger: true },
  ];
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableMenu"
      shouldShow={({ editor }) => editor.isActive("table") && editor.state.selection.empty}
      options={{ placement: "top" }}
      className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      {items.map((it, i) => (
        <button
          key={i}
          type="button"
          title={it.label}
          aria-label={it.label}
          onClick={it.run}
          className={`touch-target focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium transition-colors ${
            it.danger
              ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          }`}
        >
          <it.icon className="h-3.5 w-3.5" />
          {it.label}
        </button>
      ))}
    </BubbleMenu>
  );
}
