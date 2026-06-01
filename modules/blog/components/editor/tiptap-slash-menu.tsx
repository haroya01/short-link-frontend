"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useTranslations } from "next-intl";
import {
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  type LucideIcon,
  Minus,
  Quote,
  Video,
} from "lucide-react";
import { keywordMatch, matchSlashQuery } from "@/modules/blog/components/editor/slash-menu-logic";

/**
 * Notion-style "/" block menu for the Tiptap editor (restores the system the old Toast editor had).
 * The slash + query are real typed characters, so detection just reads the text before the caret via
 * the shared, unit-tested {@link matchSlashQuery}; choosing an item deletes that "/query" run and
 * runs the Tiptap command. The "+" button opens the same menu by typing a "/". Arrow / Enter / Esc
 * drive the menu while it's open.
 */
type SlashItem = {
  key: string;
  labelKey: string;
  icon: LucideIcon;
  keywords: string[];
  run: (editor: Editor) => void;
};

function buildItems(pickImage: () => void): SlashItem[] {
  return [
    { key: "h1", labelKey: "heading1", icon: Heading1, keywords: ["h1", "heading", "title", "제목", "見出し"], run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
    { key: "h2", labelKey: "heading2", icon: Heading2, keywords: ["h2", "heading", "subtitle", "제목"], run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { key: "h3", labelKey: "heading3", icon: Heading3, keywords: ["h3", "heading", "제목"], run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
    { key: "bullet", labelKey: "bulletList", icon: List, keywords: ["bullet", "list", "ul", "목록", "리스트", "リスト"], run: (e) => e.chain().focus().toggleBulletList().run() },
    { key: "ordered", labelKey: "orderedList", icon: ListOrdered, keywords: ["ordered", "number", "ol", "번호", "리스트"], run: (e) => e.chain().focus().toggleOrderedList().run() },
    { key: "quote", labelKey: "quote", icon: Quote, keywords: ["quote", "blockquote", "인용", "引用"], run: (e) => e.chain().focus().toggleBlockquote().run() },
    { key: "code", labelKey: "codeBlock", icon: Code2, keywords: ["code", "codeblock", "pre", "코드", "コード"], run: (e) => e.chain().focus().toggleCodeBlock().run() },
    { key: "image", labelKey: "image", icon: ImageIcon, keywords: ["image", "img", "photo", "이미지", "사진", "画像"], run: () => pickImage() },
    { key: "embed", labelKey: "embed", icon: Video, keywords: ["video", "embed", "youtube", "vimeo", "동영상", "비디오", "임베드", "動画"], run: (e) => { const url = window.prompt("URL (YouTube / Vimeo)"); if (url && url.trim()) e.chain().focus().insertContent(url.trim()).run(); } },
    { key: "hr", labelKey: "divider", icon: Minus, keywords: ["divider", "hr", "rule", "line", "구분선", "区切り"], run: (e) => e.chain().focus().setHorizontalRule().run() },
  ];
}

type MenuState = { query: string; top: number; left: number } | null;

export function SlashMenu({ editor, onPickImage }: { editor: Editor; onPickImage: () => void }) {
  const t = useTranslations("postEditor.slash");
  const [menu, setMenu] = useState<MenuState>(null);
  const [active, setActive] = useState(0);

  const filtered = useMemo(
    () => (menu ? buildItems(onPickImage).filter((i) => keywordMatch(i.keywords, menu.query)) : []),
    [menu, onPickImage],
  );

  const choose = useCallback(
    (item: SlashItem) => {
      const sel = editor.state.selection;
      const caret = sel.from;
      const q = menu?.query ?? "";
      // delete the "/query" run (slash = 1 char before the query)
      editor.chain().focus().deleteRange({ from: caret - q.length - 1, to: caret }).run();
      item.run(editor);
      setMenu(null);
    },
    [editor, menu],
  );

  // Detect the "/" trigger from the text before the caret on every selection/content change.
  useEffect(() => {
    const update = () => {
      const { state } = editor;
      const sel = state.selection;
      if (!sel.empty) return setMenu(null);
      const $from = sel.$from;
      // Only in textblocks (skip inside the CodeMirror code block, which owns its own input).
      if (!$from.parent.isTextblock || $from.parent.type.name === "codeBlock") return setMenu(null);
      const before = state.doc.textBetween($from.start(), $from.pos, "\n", "");
      const q = matchSlashQuery(before);
      if (q === null) return setMenu(null);
      const coords = editor.view.coordsAtPos($from.pos);
      setMenu({ query: q, top: coords.bottom + 6, left: coords.left });
      setActive(0);
    };
    editor.on("selectionUpdate", update);
    editor.on("update", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("update", update);
    };
  }, [editor]);

  // Keyboard nav while open (capture so it drives the menu, not the editor caret).
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (filtered.length === 0) {
        if (e.key === "Escape") setMenu(null);
        return;
      }
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % filtered.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + filtered.length) % filtered.length); }
      else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); choose(filtered[active]); }
      else if (e.key === "Escape") { e.preventDefault(); setMenu(null); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [menu, filtered, active, choose]);

  if (!menu || filtered.length === 0) return null;

  return (
    <div
      role="listbox"
      className="fixed z-50 max-h-72 w-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
      style={{ top: menu.top, left: menu.left }}
    >
      {filtered.map((item, i) => (
        <button
          key={item.key}
          type="button"
          role="option"
          aria-selected={i === active}
          onMouseDown={(e) => { e.preventDefault(); choose(item); }}
          onMouseEnter={() => setActive(i)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
            i === active
              ? "bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300"
              : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <item.icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
          {t(item.labelKey)}
        </button>
      ))}
    </div>
  );
}
