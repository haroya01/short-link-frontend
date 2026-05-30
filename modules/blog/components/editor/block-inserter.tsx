"use client";

import { useEffect, useState, type RefObject } from "react";
import { Plus } from "lucide-react";
import type { SlashEditor } from "@/modules/blog/components/editor/slash-menu";

/**
 * Medium/Notion-style "add block" affordance: a "+" sits to the left of the current empty line so
 * block insertion is discoverable without already knowing the slash menu (the selection bubble only
 * covers formatting *selected* text — it can't help on an empty line). Clicking it just types "/",
 * which opens the existing slash menu, so there's one block menu, one source of truth.
 *
 * Desktop only — phones keep the always-visible bottom toolbar, which already exposes everything.
 */
export function BlockInserter({
  editor,
  editorHost,
}: {
  editor: SlashEditor;
  editorHost: RefObject<HTMLElement>;
}) {
  const [top, setTop] = useState<number | null>(null);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!window.matchMedia("(min-width: 640px)").matches) return;
    const host = editorHost.current;
    if (!host) return;

    const compute = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return setTop(null);
      const node = sel.anchorNode;
      if (!node || !host.contains(node)) return setTop(null);
      const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
      const block = el?.closest("p, h1, h2, h3, blockquote, li, pre, td, th");
      // Only on an empty block — that's where "add something" makes sense (Medium behavior).
      if (!block || (block.textContent ?? "").trim() !== "") return setTop(null);
      const hostRect = host.getBoundingClientRect();
      const r = block.getBoundingClientRect();
      // Sit ~34px left of the text, but never spill past the host's left edge.
      setLeft(Math.max(2, r.left - hostRect.left - 34));
      setTop(r.top - hostRect.top + r.height / 2);
    };

    compute();
    document.addEventListener("selectionchange", compute);
    host.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      document.removeEventListener("selectionchange", compute);
      host.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [editorHost]);

  if (top === null) return null;

  return (
    <button
      type="button"
      aria-label="Add a block"
      // Keep the caret on the line so the inserted "/" lands there.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        editor.focus();
        editor.insertText("/");
      }}
      className="absolute z-20 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-accent-600"
      style={{ top, left }}
    >
      <Plus className="h-4 w-4" />
    </button>
  );
}
