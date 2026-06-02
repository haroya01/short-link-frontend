"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useTranslations } from "next-intl";
import {
  Code2,
  Columns2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  type LucideIcon,
  MapPin,
  Minus,
  Quote,
  RectangleHorizontal,
  Table as TableIcon,
  Video,
} from "lucide-react";
import { keywordMatch, matchSlashQuery } from "@/modules/blog/components/editor/slash-menu-logic";
import type { ImagePickOptions } from "@/modules/blog/components/editor/markdown-editor";

/**
 * Notion-style "/" block menu for the Tiptap editor (restores the system the old Toast editor had).
 * The slash + query are real typed characters, so detection just reads the text before the caret via
 * the shared, unit-tested {@link matchSlashQuery}; choosing an item deletes that "/query" run and
 * runs the Tiptap command. The "+" button opens the same menu by typing a "/". Arrow / Enter / Esc
 * drive the menu while it's open.
 */
type SlashGroup = "basic" | "media" | "advanced";
type SlashItem = {
  key: string;
  labelKey: string;
  group: SlashGroup;
  icon: LucideIcon;
  keywords: string[];
  run: (editor: Editor) => void;
};

// Notion-style grouping: text/structure first, then media, then advanced.
const GROUP_ORDER: SlashGroup[] = ["basic", "media", "advanced"];
const GROUP_LABEL: Record<SlashGroup, string> = {
  basic: "groupBasic",
  media: "groupMedia",
  advanced: "groupAdvanced",
};

function buildItems(
  pickImage: (opts?: ImagePickOptions) => void,
  onPickPlace: () => void,
  onPickEmbed: () => void,
): SlashItem[] {
  return [
    { key: "h1", labelKey: "heading1", group: "basic", icon: Heading1, keywords: ["h1", "heading", "title", "제목", "見出し"], run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
    { key: "h2", labelKey: "heading2", group: "basic", icon: Heading2, keywords: ["h2", "heading", "subtitle", "제목"], run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { key: "h3", labelKey: "heading3", group: "basic", icon: Heading3, keywords: ["h3", "heading", "제목"], run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
    { key: "bullet", labelKey: "bulletList", group: "basic", icon: List, keywords: ["bullet", "list", "ul", "목록", "리스트", "リスト"], run: (e) => e.chain().focus().toggleBulletList().run() },
    { key: "ordered", labelKey: "orderedList", group: "basic", icon: ListOrdered, keywords: ["ordered", "number", "ol", "번호", "리스트"], run: (e) => e.chain().focus().toggleOrderedList().run() },
    { key: "quote", labelKey: "quote", group: "basic", icon: Quote, keywords: ["quote", "blockquote", "인용", "引用"], run: (e) => e.chain().focus().toggleBlockquote().run() },
    { key: "hr", labelKey: "divider", group: "basic", icon: Minus, keywords: ["divider", "hr", "rule", "line", "구분선", "区切り"], run: (e) => e.chain().focus().setHorizontalRule().run() },
    { key: "image", labelKey: "image", group: "media", icon: ImageIcon, keywords: ["image", "img", "photo", "이미지", "사진", "画像"], run: () => pickImage() },
    { key: "imageWide", labelKey: "imageWide", group: "media", icon: RectangleHorizontal, keywords: ["wide", "image", "cover", "hero", "banner", "와이드", "넓은", "배너", "ワイド"], run: () => pickImage({ width: "wide" }) },
    { key: "imagePair", labelKey: "imagePair", group: "media", icon: Columns2, keywords: ["pair", "two", "gallery", "side", "2", "나란히", "두장", "갤러리", "並べ"], run: () => pickImage({ width: "half", multiple: true }) },
    { key: "embed", labelKey: "embed", group: "media", icon: Video, keywords: ["video", "embed", "youtube", "vimeo", "동영상", "비디오", "임베드", "動画"], run: () => onPickEmbed() },
    { key: "place", labelKey: "place", group: "media", icon: MapPin, keywords: ["map", "place", "location", "지도", "장소", "위치", "地図", "場所"], run: () => onPickPlace() },
    { key: "code", labelKey: "codeBlock", group: "advanced", icon: Code2, keywords: ["code", "codeblock", "pre", "코드", "コード"], run: (e) => e.chain().focus().toggleCodeBlock().run() },
    { key: "table", labelKey: "table", group: "advanced", icon: TableIcon, keywords: ["table", "grid", "표", "테이블", "テーブル", "表"], run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  ];
}

// `top` OR `bottom` is set (not both): bottom-anchored when the menu would overflow past the viewport
// bottom (e.g. typing "/" on the last line), so it flips above the caret instead of off-screen.
type MenuState = { query: string; left: number; top?: number; bottom?: number } | null;
const MENU_MAX_H = 340; // max-h-80 (320px) + padding — room needed below before we flip up.
const MENU_W = 288; // w-72

export function SlashMenu({
  editor,
  onPickImage,
  onPickPlace,
  onPickEmbed,
}: {
  editor: Editor;
  onPickImage: (opts?: ImagePickOptions) => void;
  onPickPlace: () => void;
  onPickEmbed: () => void;
}) {
  const t = useTranslations("postEditor.slash");
  const [menu, setMenu] = useState<MenuState>(null);
  const [active, setActive] = useState(0);

  const filtered = useMemo(
    () =>
      menu
        ? buildItems(onPickImage, onPickPlace, onPickEmbed).filter((i) => keywordMatch(i.keywords, menu.query))
        : [],
    [menu, onPickImage, onPickPlace, onPickEmbed],
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
      const left = Math.max(8, Math.min(coords.left, window.innerWidth - MENU_W - 8));
      // Flip above the caret when there isn't room below (bottom of the editor) so the menu never
      // renders off-screen / clipped.
      const roomBelow = window.innerHeight - coords.bottom;
      const next =
        roomBelow < MENU_MAX_H
          ? { query: q, left, bottom: window.innerHeight - coords.top + 6 }
          : { query: q, left, top: coords.bottom + 6 };
      setMenu(next);
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

  if (!menu) return null;

  return (
    <div
      role="listbox"
      className="fixed z-50 max-h-80 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      style={menu.bottom != null ? { bottom: menu.bottom, left: menu.left } : { top: menu.top, left: menu.left }}
    >
      {filtered.length === 0 ? (
        <p className="px-2.5 py-3 text-sm text-slate-400 dark:text-slate-500">{t("empty")}</p>
      ) : (
        GROUP_ORDER.map((group) => {
          const groupItems = filtered.filter((it) => it.group === group);
          if (groupItems.length === 0) return null;
          return (
            <div key={group} className="mb-0.5 last:mb-0">
              <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {t(GROUP_LABEL[group])}
              </p>
              {groupItems.map((item) => {
                const i = filtered.indexOf(item);
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => { e.preventDefault(); choose(item); }}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      i === active
                        ? "bg-accent-50 dark:bg-accent-500/15"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border ${
                        i === active
                          ? "border-accent-200 bg-white text-accent-700 dark:border-accent-500/30 dark:bg-slate-900 dark:text-accent-300"
                          : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
                        {t(item.labelKey)}
                      </span>
                      <span className="block truncate text-[12px] text-slate-400 dark:text-slate-500">
                        {t(`desc.${item.labelKey}`)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}
