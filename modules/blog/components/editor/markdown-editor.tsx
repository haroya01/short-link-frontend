"use client";

import { useEffect, useRef, useState } from "react";
import "@toast-ui/editor/dist/toastui-editor.css";
import "tui-color-picker/dist/tui-color-picker.css";
import "@toast-ui/editor-plugin-color-syntax/dist/toastui-editor-plugin-color-syntax.css";
import { highlightPlugin } from "@/modules/blog/components/editor/highlight-plugin";
import {
  FloatingToolbar,
  type EditorCommands,
} from "@/modules/blog/components/editor/floating-toolbar";
import { SlashMenu, type SlashEditor } from "@/modules/blog/components/editor/slash-menu";
import { BlockInserter } from "@/modules/blog/components/editor/block-inserter";

/**
 * Toast UI Editor (vanilla — the React wrapper only peer-supports React 17). WYSIWYG + markdown
 * tabs and an image hook wired to the post's presign→commit uploader so authors can drop / paste /
 * pick images inline. Toast's own top toolbar is hidden (CSS in globals); formatting is driven by a
 * custom {@link FloatingToolbar} that floats at the bottom — its dropdown opens upward, which
 * Toast's downward-opening one couldn't. The JS is dynamically imported inside the effect so it
 * never evaluates during SSR; the component renders just a host div on the server.
 */
type ToastInstance = EditorCommands &
  SlashEditor & {
    getMarkdown: () => string;
    destroy: () => void;
  };

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
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onUploadRef = useRef(onUploadImage);
  const onUploadErrorRef = useRef(onUploadError);
  onChangeRef.current = onChange;
  onUploadRef.current = onUploadImage;
  onUploadErrorRef.current = onUploadError;
  const [commands, setCommands] = useState<ToastInstance | null>(null);

  useEffect(() => {
    let editor: ToastInstance | undefined;
    let cancelled = false;
    void Promise.all([
      import("@toast-ui/editor"),
      import("@toast-ui/editor-plugin-color-syntax"),
    ]).then(([{ default: Editor }, { default: colorSyntax }]) => {
      if (cancelled || !hostRef.current) return;
      editor = new Editor({
        el: hostRef.current,
        height: "100%",
        initialValue: initialValue || "",
        initialEditType: "wysiwyg",
        previewStyle: "tab",
        usageStatistics: false,
        autofocus: false,
        plugins: [colorSyntax, highlightPlugin],
        hooks: {
          addImageBlobHook: async (
            blob: Blob,
            callback: (url: string, alt?: string) => void,
          ) => {
            try {
              const url = await onUploadRef.current(blob);
              const name = blob instanceof File ? blob.name : "image";
              callback(url, name);
            } catch (e) {
              // Returning without calling back keeps the editor from embedding a base64 blob; surface
              // the reason so a failed paste/drop isn't silent.
              onUploadErrorRef.current?.(e instanceof Error ? e.message : "image upload failed");
            }
            return false;
          },
        },
        events: {
          change: () => {
            if (editor) onChangeRef.current(editor.getMarkdown());
          },
        },
      }) as unknown as ToastInstance;
      setCommands(editor);
    });
    return () => {
      cancelled = true;
      setCommands(null);
      editor?.destroy();
    };
    // Mount once; `initialValue` is already loaded before this renders (the page gates on loading).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-full">
      <div ref={hostRef} className="h-full" />
      {commands && (
        <>
          <BlockInserter editor={commands} editorHost={hostRef} />
          <SlashMenu
            editor={commands}
            editorHost={hostRef}
            onUploadImage={onUploadImage}
            onUploadError={onUploadError}
          />
          <FloatingToolbar
            editor={commands}
            onUploadImage={onUploadImage}
            onUploadError={onUploadError}
            editorHost={hostRef}
          />
        </>
      )}
    </div>
  );
}
