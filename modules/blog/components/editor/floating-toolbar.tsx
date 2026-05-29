"use client";

import { useEffect, useRef, useState } from "react";
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
 * Apple-Notes-style floating toolbar. Sits at the bottom of the editor (a centered pill on
 * desktop, a full-width bar above the keyboard on mobile) instead of Toast's top toolbar — which
 * can't move down because its dropdowns open downward. Buttons drive editor.exec; the one popover
 * (text color) opens upward so it can't run off the bottom.
 */
export function FloatingToolbar({
  editor,
  onUploadImage,
}: {
  editor: EditorCommands;
  onUploadImage: (file: Blob) => Promise<string>;
}) {
  const [palette, setPalette] = useState(false);
  const kbInset = useKeyboardInset();
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
    } catch {
      /* uploader surfaces the error */
    }
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-2 pb-2 sm:pb-3"
      style={{ bottom: kbInset }}
    >
      {/* Popover lives OUTSIDE the scrollable pill — an overflow-x-auto container would clip its
          upward overflow. Anchored to this relative wrapper instead. */}
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
          <Btn
            label="color"
            active={palette}
            onClick={() => setPalette((v) => !v)}
          >
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
