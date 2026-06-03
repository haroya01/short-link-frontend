"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { useTranslations } from "next-intl";
import {
  Copy,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Plus,
  Quote,
  Trash2,
  Type,
  type LucideIcon,
} from "lucide-react";

type Target = { node: PMNode; pos: number };

/**
 * Notion-style block gutter: on hover, a `+` (add a block below) and a `⋮⋮` grip appear to the LEFT
 * of the block. Dragging the grip reorders blocks (handled by Tiptap's official drag-handle plugin);
 * clicking it opens a block menu — turn into · duplicate · delete. The `+` inserts an empty block
 * below and opens the slash menu (by typing "/"), so the two affordances mirror Notion's.
 */
export function EditorBlockHandle({ editor }: { editor: Editor }) {
  const t = useTranslations("postEditor.blockMenu");
  const [target, setTarget] = useState<Target | null>(null);
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const gripRef = useRef<HTMLButtonElement>(null);

  // Insert an empty paragraph right after the hovered block and drop the caret into it, then type "/"
  // so the slash menu opens — same as clicking Notion's "+".
  function addBelow() {
    const { state } = editor;
    const docEnd = state.doc.content.size;
    let end: number;
    if (target) {
      // Re-resolve the node at the stored pos (the hovered target can be stale if the doc changed
      // since hover — that's what made the "/" land in the wrong block). Clamp to the doc end.
      const pos = Math.min(target.pos, docEnd);
      const node = state.doc.nodeAt(pos);
      end = Math.min(pos + (node?.nodeSize ?? target.node.nodeSize), docEnd);
    } else {
      // The drag-handle hasn't reported a hovered node to React yet (its onNodeChange can lag a click
      // on a freshly-revealed gutter). The "+" must never silently no-op, so fall back to inserting
      // after the block that currently holds the caret.
      const $from = state.selection.$from;
      end = Math.min($from.after(Math.max(1, $from.depth)), docEnd);
    }
    // Insert an empty paragraph below and drop the caret into it. No auto-"/" — that was the fragile
    // bit (a computed insert position landing the slash in the next block); the empty-line placeholder
    // already hints "/", and typing "/" there opens the menu reliably at the caret.
    editor.chain().insertContentAt(end, { type: "paragraph" }).focus(end + 1).run();
  }

  function openMenu() {
    const r = gripRef.current?.getBoundingClientRect();
    if (r) setMenuAt({ x: r.right + 6, y: r.top });
  }

  // Re-resolve the hovered block at action time (like addBelow): the stored hover-time pos/node can be
  // stale if the doc changed between hover and click (an async image insert finishing above, an
  // autosave reflow), and acting on a stale position duplicates/deletes the WRONG block.
  function resolved(): Target | null {
    if (!target) return null;
    const { state } = editor;
    const pos = Math.min(target.pos, state.doc.content.size);
    const node = state.doc.nodeAt(pos) ?? target.node;
    return { pos, node };
  }

  // Run a transform against the hovered block: drop the caret inside it first so the command applies
  // to that block regardless of where the real selection is.
  function turnInto(run: () => void) {
    const r = resolved();
    if (!r) return;
    editor.chain().focus().setTextSelection(r.pos + 1).run();
    run();
    setMenuAt(null);
  }

  function duplicate() {
    const r = resolved();
    if (!r) return;
    const end = r.pos + r.node.nodeSize;
    editor.chain().focus().insertContentAt(end, r.node.toJSON()).run();
    setMenuAt(null);
  }

  function remove() {
    const r = resolved();
    if (!r) return;
    editor.chain().focus().deleteRange({ from: r.pos, to: r.pos + r.node.nodeSize }).run();
    setMenuAt(null);
  }

  const turnIntoItems: { icon: LucideIcon; label: string; run: () => void }[] = [
    { icon: Type, label: t("paragraph"), run: () => editor.chain().focus().setParagraph().run() },
    { icon: Heading1, label: "제목 1", run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { icon: Heading2, label: "제목 2", run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: Heading3, label: "제목 3", run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { icon: List, label: "글머리 목록", run: () => editor.chain().focus().toggleBulletList().run() },
    { icon: ListOrdered, label: "번호 목록", run: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: Quote, label: "인용", run: () => editor.chain().focus().toggleBlockquote().run() },
  ];

  const ghostBtn =
    "grid h-6 w-5 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300";

  return (
    <>
      <DragHandle
        editor={editor}
        onNodeChange={(data) => {
          if (data.node) setTarget({ node: data.node, pos: data.pos });
          setMenuAt(null);
        }}
      >
        <div className="flex items-center pr-1">
          <button type="button" aria-label={t("add")} title={t("add")} className={ghostBtn} onClick={addBelow}>
            <Plus className="h-4 w-4" />
          </button>
          <button
            ref={gripRef}
            type="button"
            aria-label={t("drag")}
            title={t("drag")}
            className={`${ghostBtn} cursor-grab active:cursor-grabbing`}
            onClick={openMenu}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      </DragHandle>

      {menuAt &&
        createPortal(
          <>
            {/* Click-away catcher */}
            <div className="fixed inset-0 z-40" onMouseDown={() => setMenuAt(null)} />
            <div
              role="menu"
              className="fixed z-50 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
              style={{ left: menuAt.x, top: menuAt.y }}
            >
              <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {t("turnInto")}
              </p>
              {turnIntoItems.map((it) => (
                <button
                  key={it.label}
                  type="button"
                  role="menuitem"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    turnInto(it.run);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <it.icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  {it.label}
                </button>
              ))}
              <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
              <button
                type="button"
                role="menuitem"
                onMouseDown={(e) => { e.preventDefault(); duplicate(); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                {t("duplicate")}
              </button>
              <button
                type="button"
                role="menuitem"
                onMouseDown={(e) => { e.preventDefault(); remove(); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                {t("delete")}
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
