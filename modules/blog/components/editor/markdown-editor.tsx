"use client";

import { useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from "lucide-react";
import { CodeMirrorBlock } from "@/modules/blog/components/editor/codemirror-block";

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
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadAndInsert(ed: Editor, file: File) {
    try {
      const url = await onUploadImage(file);
      ed.chain().focus().setImage({ src: url, alt: file.name }).run();
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
      Placeholder.configure({ placeholder: "" }),
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
      <Toolbar editor={editor} onPickImage={() => fileRef.current?.click()} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void uploadAndInsert(editor, f);
          e.target.value = "";
        }}
      />
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}

function Toolbar({ editor, onPickImage }: { editor: Editor; onPickImage: () => void }) {
  const btn = (active: boolean) =>
    `focus-ring grid h-8 w-8 place-items-center rounded-lg transition-colors ${
      active
        ? "bg-accent-50 text-accent-700"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
    }`;

  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-white/90 py-1.5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <button type="button" aria-label="H2" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></button>
      <button type="button" aria-label="H3" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></button>
      <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button type="button" aria-label="Bold" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></button>
      <button type="button" aria-label="Italic" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></button>
      <button type="button" aria-label="Strike" className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></button>
      <button type="button" aria-label="Link" className={btn(editor.isActive("link"))} onClick={setLink}><LinkIcon className="h-4 w-4" /></button>
      <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button type="button" aria-label="Bullet list" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></button>
      <button type="button" aria-label="Ordered list" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></button>
      <button type="button" aria-label="Quote" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></button>
      <button type="button" aria-label="Code block" className={btn(editor.isActive("codeBlock"))} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 className="h-4 w-4" /></button>
      <button type="button" aria-label="Image" className={btn(false)} onClick={onPickImage}><ImageIcon className="h-4 w-4" /></button>
    </div>
  );
}
