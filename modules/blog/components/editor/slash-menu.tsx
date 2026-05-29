"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useTranslations } from "next-intl";
import {
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  type LucideIcon,
} from "lucide-react";
import { keywordMatch, matchSlashQuery } from "@/modules/blog/components/editor/slash-menu-logic";

/** The slice of the Toast UI editor instance the slash menu drives. */
export type SlashEditor = {
  exec: (command: string, payload?: Record<string, unknown>) => void;
  getSelection: () => unknown;
  deleteSelection: (start: number, end: number) => void;
  isWysiwygMode: () => boolean;
  focus: () => void;
};

type SlashItem = {
  key: string;
  labelKey: string;
  icon: LucideIcon;
  keywords: string[];
  /** Block command run after the "/query" text is removed. Omitted for the image picker. */
  run?: (editor: SlashEditor) => void;
  image?: boolean;
};

// Order = menu order. keywords power the type-to-filter ("/h1", "/img", …).
const ITEMS: SlashItem[] = [
  {
    key: "h1",
    labelKey: "heading1",
    icon: Heading1,
    keywords: ["h1", "heading", "title", "제목", "見出し"],
    run: (e) => e.exec("heading", { level: 1 }),
  },
  {
    key: "h2",
    labelKey: "heading2",
    icon: Heading2,
    keywords: ["h2", "heading", "subtitle", "제목"],
    run: (e) => e.exec("heading", { level: 2 }),
  },
  {
    key: "h3",
    labelKey: "heading3",
    icon: Heading3,
    keywords: ["h3", "heading", "제목"],
    run: (e) => e.exec("heading", { level: 3 }),
  },
  {
    key: "ul",
    labelKey: "bulletList",
    icon: List,
    keywords: ["bullet", "list", "ul", "목록", "리스트", "リスト"],
    run: (e) => e.exec("bulletList"),
  },
  {
    key: "ol",
    labelKey: "orderedList",
    icon: ListOrdered,
    keywords: ["ordered", "number", "ol", "번호", "리스트"],
    run: (e) => e.exec("orderedList"),
  },
  {
    key: "quote",
    labelKey: "quote",
    icon: Quote,
    keywords: ["quote", "blockquote", "인용", "引用"],
    run: (e) => e.exec("blockQuote"),
  },
  {
    key: "code",
    labelKey: "codeBlock",
    icon: Code2,
    keywords: ["code", "codeblock", "pre", "코드", "コード"],
    run: (e) => e.exec("codeBlock"),
  },
  {
    key: "image",
    labelKey: "image",
    icon: ImageIcon,
    keywords: ["image", "img", "photo", "picture", "이미지", "사진", "画像"],
    image: true,
  },
  {
    key: "hr",
    labelKey: "divider",
    icon: Minus,
    keywords: ["divider", "hr", "rule", "line", "구분선", "区切り"],
    run: (e) => e.exec("hr"),
  },
];

type Trigger = { query: string; rect: DOMRect };

function caretPos(selection: unknown): number | null {
  // WYSIWYG getSelection() → [from, to] as ProseMirror positions; collapsed caret means from === to.
  if (Array.isArray(selection) && selection.length === 2 && typeof selection[1] === "number") {
    return selection[1];
  }
  return null;
}

/**
 * Notion-style "/" block menu. The slash and any query are real characters typed into the editor,
 * so detection just reads the text before the caret; choosing an item removes that "/query" run via
 * the editor's position API and then executes the block command. Arrow keys / Enter / Esc are
 * captured on the editor element while the menu is open so they drive the menu, not the caret.
 */
export function SlashMenu({
  editor,
  editorHost,
  onUploadImage,
}: {
  editor: SlashEditor;
  editorHost: RefObject<HTMLElement>;
  onUploadImage: (file: Blob) => Promise<string>;
}) {
  const t = useTranslations("postEditor.slash");
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [active, setActive] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!trigger) return [];
    return ITEMS.filter((it) => keywordMatch(it.keywords, trigger.query));
  }, [trigger]);

  const open = trigger !== null && filtered.length > 0;
  const act = Math.min(active, filtered.length - 1);

  // Detect the "/query" context at the caret and track its screen position.
  useEffect(() => {
    const compute = () => {
      const host = editorHost.current;
      const sel = window.getSelection();
      if (!host || !sel || sel.rangeCount === 0 || !sel.isCollapsed) return setTrigger(null);
      const node = sel.anchorNode;
      if (!node || !host.contains(node)) return setTrigger(null);
      const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
      if (el?.closest("pre, code")) return setTrigger(null); // "/" is literal inside code
      const before = (node.textContent ?? "").slice(0, sel.anchorOffset);
      const query = matchSlashQuery(before);
      if (query === null) return setTrigger(null);
      const r = sel.getRangeAt(0).getBoundingClientRect();
      const rect = r.width === 0 && r.height === 0 ? el?.getBoundingClientRect() : r;
      if (!rect) return setTrigger(null);
      setTrigger({ query, rect });
    };
    compute();
    document.addEventListener("selectionchange", compute);
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      document.removeEventListener("selectionchange", compute);
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [editorHost]);

  // Reset the highlight whenever the query changes.
  useEffect(() => setActive(0), [trigger?.query]);

  const choose = (item: SlashItem | undefined) => {
    if (!item || !trigger) return;
    if (!editor.isWysiwygMode()) return setTrigger(null);
    const caret = caretPos(editor.getSelection());
    if (caret == null) return setTrigger(null);
    // Drop the typed "/query" so the block command applies to a clean line.
    editor.deleteSelection(caret - (trigger.query.length + 1), caret);
    setTrigger(null);
    if (item.image) {
      fileRef.current?.click();
      return;
    }
    item.run?.(editor);
    editor.focus();
  };

  // Keyboard navigation — captured on the editor element so it beats ProseMirror's own handlers.
  useEffect(() => {
    const host = editorHost.current;
    if (!host || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        choose(filtered[act]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setTrigger(null);
      }
    };
    host.addEventListener("keydown", onKey, true);
    return () => host.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorHost, open, filtered, act]);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            const url = await onUploadImage(f);
            editor.exec("addImage", { imageUrl: url, altText: f.name.replace(/\.[^.]+$/, "") });
            editor.focus();
          } catch {
            /* uploader surfaces the error */
          }
        }}
      />
      {open && trigger && (
        <Dropdown rect={trigger.rect} count={filtered.length} menuRef={menuRef}>
          <ul className="max-h-72 w-60 overflow-y-auto py-1.5">
            {filtered.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    // Keep the editor focused/selected so getSelection() is valid on click.
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(item)}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[14px] transition-colors ${
                      i === act ? "bg-accent-50 text-accent-800" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border ${
                        i === act
                          ? "border-accent-200 bg-white text-accent-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    {t(item.labelKey)}
                  </button>
                </li>
              );
            })}
          </ul>
        </Dropdown>
      )}
    </>
  );
}

/**
 * Anchors the menu just below the caret (flipping above when there's no room) and clamps it inside
 * the viewport. Measures itself first, then positions before paint so there's no jump.
 */
function Dropdown({
  rect,
  count,
  menuRef,
  children,
}: {
  rect: DOMRect;
  count: number;
  menuRef: RefObject<HTMLDivElement>;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const gap = 6;
    const m = 8;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.max(m, Math.min(window.innerWidth - m - w, rect.left));
    const below = rect.bottom + gap;
    const top =
      below + h <= window.innerHeight - m
        ? below
        : Math.max(m, rect.top - h - gap);
    setPos({ top, left });
  }, [rect, count, menuRef]);

  return (
    <div
      ref={menuRef}
      className="fixed z-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.28)]"
      style={{ top: pos?.top ?? rect.bottom + 6, left: pos?.left ?? rect.left, opacity: pos ? 1 : 0 }}
    >
      {children}
    </div>
  );
}
