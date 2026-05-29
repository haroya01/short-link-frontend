"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Bold,
  Code,
  Heading,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Palette,
  Quote,
  Strikethrough,
} from "lucide-react";

/** Minimal command surface the floating bar drives — Toast UI's editor.exec. */
export type EditorCommands = {
  exec: (command: string, payload?: unknown) => void;
  getSelectedText?: () => string;
};

const TEXT_COLORS = [
  "#e11d48",
  "#ea580c",
  "#ca8a04",
  "#059669",
  "#2563eb",
  "#7c3aed",
  "#0f172a",
];

/**
 * Formatting toolbar driven by editor.exec. Two presentations from one button set:
 *
 * - Mobile: a full-width pill fixed above the on-screen keyboard (Apple-Notes style). Selection on
 *   a phone is fiddly, so the bar is always reachable at the bottom.
 * - Desktop: a Notion/Medium-style bubble that appears just above the current text selection and
 *   hides when nothing is selected, so it sits next to what you're formatting instead of floating
 *   far away at the bottom of the screen.
 *
 * Toast's own top toolbar is hidden (CSS); its dropdowns open downward and couldn't follow a
 * moving bar. Our one popover (text color) opens upward.
 */
export function FloatingToolbar({
  editor,
  onUploadImage,
  onUploadError,
  editorHost,
}: {
  editor: EditorCommands;
  onUploadImage: (file: Blob) => Promise<string>;
  onUploadError?: (message: string) => void;
  editorHost: RefObject<HTMLElement>;
}) {
  const [palette, setPalette] = useState(false);
  const kbInset = useKeyboardInset();
  const isDesktop = useIsDesktop();
  const selRect = useSelectionRect(editorHost, isDesktop);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (command: string, payload?: unknown) => {
    editor.exec(command, payload);
    setPalette(false);
  };

  const addLink = () => {
    const url = window.prompt("URL");
    if (!url) return;
    const text = editor.getSelectedText?.() || url;
    editor.exec("addLink", { linkUrl: url, linkText: text });
  };

  const onPickImage = async (file: File) => {
    try {
      const url = await onUploadImage(file);
      editor.exec("addImage", {
        imageUrl: url,
        altText: file.name.replace(/\.[^.]+$/, ""),
      });
    } catch (e) {
      onUploadError?.(e instanceof Error ? e.message : "image upload failed");
    }
  };

  // The pill — shared by both presentations. Popover lives OUTSIDE the scrollable row (an
  // overflow-x-auto container would clip its upward overflow), anchored to this relative wrapper.
  const pill = (
    <div className="pointer-events-auto relative max-w-full">
      {palette && (
        <div className="absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`color ${c}`}
              // Keep the editor focused/selected — without this, mousedown blurs the
              // contenteditable and the color applies to a collapsed selection (i.e. nothing).
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run("color", { selectedColor: c })}
              className="h-6 w-6 rounded-full ring-1 ring-black/5"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      <div className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-slate-200 bg-white/95 px-1.5 py-1 shadow-[0_6px_24px_-8px_rgba(15,23,42,0.25)] backdrop-blur">
        <Btn label="bold" onClick={() => run("bold")}>
          <Bold className="h-[18px] w-[18px]" />
        </Btn>
        <Btn label="italic" onClick={() => run("italic")}>
          <Italic className="h-[18px] w-[18px]" />
        </Btn>
        <Btn label="strike" onClick={() => run("strike")}>
          <Strikethrough className="h-[18px] w-[18px]" />
        </Btn>
        <Divider />
        <Btn label="heading" onClick={() => run("heading", { level: 2 })}>
          <Heading className="h-[18px] w-[18px]" />
        </Btn>
        <Btn label="bullet list" onClick={() => run("bulletList")}>
          <List className="h-[18px] w-[18px]" />
        </Btn>
        <Btn label="ordered list" onClick={() => run("orderedList")}>
          <ListOrdered className="h-[18px] w-[18px]" />
        </Btn>
        <Btn label="quote" onClick={() => run("blockQuote")}>
          <Quote className="h-[18px] w-[18px]" />
        </Btn>
        <Btn label="code" onClick={() => run("code")}>
          <Code className="h-[18px] w-[18px]" />
        </Btn>
        <Divider />
        <Btn label="link" onClick={addLink}>
          <Link2 className="h-[18px] w-[18px]" />
        </Btn>
        <Btn label="image" onClick={() => fileRef.current?.click()}>
          <ImageIcon className="h-[18px] w-[18px]" />
        </Btn>
        <Btn label="highlight" onClick={() => run("highlight")}>
          <Highlighter className="h-[18px] w-[18px]" />
        </Btn>
        <Btn label="color" active={palette} onClick={() => setPalette((v) => !v)}>
          <Palette className="h-[18px] w-[18px]" />
        </Btn>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPickImage(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );

  // Desktop: bubble anchored to the selection. Hidden when there's no selection.
  if (isDesktop) {
    if (!selRect) return null;
    return <SelectionBubble rect={selRect}>{pill}</SelectionBubble>;
  }

  // Mobile: full-width bar riding above the keyboard.
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-2 pb-2 sm:pb-3"
      style={{ bottom: kbInset }}
    >
      {pill}
    </div>
  );
}

/**
 * Positions the pill just above the selection rect (flipping below when there's no room above) and
 * clamps it within the viewport. Renders invisibly for one frame to measure its own size, then
 * places itself before paint so there's no jump.
 */
function SelectionBubble({ rect, children }: { rect: DOMRect; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const gap = 8;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const half = Math.min(w / 2, window.innerWidth / 2 - gap);
    const center = Math.max(
      gap + half,
      Math.min(window.innerWidth - gap - half, rect.left + rect.width / 2),
    );
    const above = rect.top - h - gap;
    const top = above >= gap ? above : rect.bottom + gap;
    setPos({ top, left: center });
  }, [rect]);

  return (
    <div
      ref={ref}
      className="pointer-events-auto fixed z-30 -translate-x-1/2"
      style={{
        top: pos?.top ?? rect.top,
        left: pos?.left ?? rect.left + rect.width / 2,
        opacity: pos ? 1 : 0,
      }}
    >
      {children}
    </div>
  );
}

function Btn({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      // preventDefault on mousedown keeps the WYSIWYG editor focused and its text selection intact.
      // The toolbar is a fixed element outside the editor DOM, so a normal click would blur the
      // contenteditable first — collapsing the selection and making selection-based commands
      // (highlight, color, and "format the selected text") silently no-op.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors ${
        active
          ? "bg-accent-50 text-accent-700"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" />;
}

/** sm breakpoint — desktop gets the selection bubble, phones keep the bottom bar. */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

/**
 * Viewport rect of the current text selection when it's a non-empty range inside the editor — used
 * to anchor the desktop bubble. Returns null when collapsed, outside the editor, or disabled. Reads
 * the native DOM selection (Toast's WYSIWYG is a contenteditable), so no editor internals needed.
 */
function useSelectionRect(host: RefObject<HTMLElement>, enabled: boolean): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!enabled) {
      setRect(null);
      return;
    }
    const compute = () => {
      const sel = window.getSelection();
      const el = host.current;
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !el) {
        setRect(null);
        return;
      }
      if (!sel.anchorNode || !el.contains(sel.anchorNode)) {
        setRect(null);
        return;
      }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      setRect(r.width === 0 && r.height === 0 ? null : r);
    };
    compute();
    document.addEventListener("selectionchange", compute);
    // Capture-phase scroll so we also catch scrolling inside the editor's own container.
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      document.removeEventListener("selectionchange", compute);
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [host, enabled]);
  return rect;
}

/**
 * Pixels the on-screen keyboard occupies at the bottom of the layout viewport. Lets the fixed
 * toolbar ride just above the keyboard on mobile (Apple Notes style) instead of being covered by
 * it. Derived from VisualViewport; returns 0 on desktop and wherever the API is unavailable.
 */
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      setInset(overlap > 80 ? overlap : 0); // ignore browser-chrome jitter; only real keyboards
    };
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
