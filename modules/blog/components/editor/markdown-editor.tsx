"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Markdown } from "tiptap-markdown";
import { Bold, Code2, Italic, Link as LinkIcon, Minus, Plus, Strikethrough, Trash2 } from "lucide-react";
import { CodeMirrorBlock } from "@/modules/blog/components/editor/codemirror-block";
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
 * Long-form post editor — Tiptap (ProseMirror) with a CodeMirror code-block node (language-aware
 * highlight + auto-indent). Content round-trips as markdown via tiptap-markdown, so the existing
 * markdown↔blocks save path is unchanged. Replaces the previous Toast UI editor.
 */
export function MarkdownEditor({
  initialValue,
  onChange,
  onUploadImage,
  onUploadError,
}: {
  initialValue: string;
  onChange: (markdown: string) => void;
  onUploadImage: (file: Blob) => Promise<string>;
  onUploadError?: (message: string) => void;
}) {
  const t = useTranslations("postEditor");
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingWidth = useRef<ImageWidth | undefined>(undefined);
  const [placeOpen, setPlaceOpen] = useState(false);
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

  const editor = useEditor({
    // Next SSR: Tiptap must not render on the server (hydration mismatch otherwise).
    immediatelyRender: false,
    extensions: [
      // codeBlock off → our CodeMirror block; link openOnClick off so clicking a link in the editor
      // places the cursor instead of opening a tab.
      StarterKit.configure({
        codeBlock: false,
        link: { openOnClick: false, enableClickSelection: true },
      }),
      CodeMirrorBlock,
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
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              void uploadAndInsert(editor, file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = (event as DragEvent).dataTransfer?.files;
        if (!files || files.length === 0 || !editor) return false;
        const img = Array.from(files).find((f) => f.type.startsWith("image/"));
        if (img) {
          event.preventDefault();
          void uploadAndInsert(editor, img);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // tiptap-markdown augments storage at runtime but ships no type for it.
      const md = (editor.storage as { markdown?: { getMarkdown: () => string } }).markdown;
      if (md) onChange(md.getMarkdown());
    },
  });

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
          // Insert sequentially so the order is stable; two "half" images land adjacent → a 2-up row.
          for (const f of files) await uploadAndInsert(editor, f, width);
        }}
      />
      {/* px-5 matches the page's px-5 so the body text lines up with the title above (the wrapper
          breaks out of that padding with -mx-5 to let «wide»/«full» images bleed wider than the text). */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
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
            editor.chain().focus().insertContent(`\n${url}\n`).run();
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
 * Selection bubble — the only persistent formatting affordance (the §10 "quiet weblog" direction: no
 * Office-style sticky toolbar). Shows the inline marks on a text selection; block insertion (headings,
 * lists, quote, code, table, image, place) lives in the slash (`/`) menu and markdown input rules
 * (`## `, `> `, `- `, ``` ```). So the writing surface stays a clean paper column until you act on text.
 */
function BubbleBar({ editor, onEditLink }: { editor: Editor; onEditLink: (href: string) => void }) {
  const btn = (active: boolean) =>
    `touch-target focus-ring grid h-8 w-8 place-items-center rounded-md transition-colors ${
      active
        ? "bg-accent-50 text-accent-700 dark:bg-accent-500/20 dark:text-accent-300"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    }`;

  const setLink = () => onEditLink((editor.getAttributes("link").href as string | undefined) ?? "");

  const items = [
    { icon: Bold, label: "Bold", active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { icon: Italic, label: "Italic", active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { icon: Strikethrough, label: "Strike", active: editor.isActive("strike"), run: () => editor.chain().focus().toggleStrike().run() },
    { icon: Code2, label: "Inline code", active: editor.isActive("code"), run: () => editor.chain().focus().toggleCode().run() },
    { icon: LinkIcon, label: "Link", active: editor.isActive("link"), run: setLink },
  ];

  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      {items.map((it, i) => (
        <button key={i} type="button" aria-label={it.label} className={btn(it.active)} onClick={it.run}>
          <it.icon className="h-4 w-4" />
        </button>
      ))}
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
