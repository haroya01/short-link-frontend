"use client";

import { useEffect, useRef } from "react";
import "@toast-ui/editor/dist/toastui-editor.css";
import "tui-color-picker/dist/tui-color-picker.css";
import "@toast-ui/editor-plugin-color-syntax/dist/toastui-editor-plugin-color-syntax.css";
import { highlightPlugin } from "@/modules/blog/components/editor/highlight-plugin";

/**
 * Toast UI Editor (vanilla — the React wrapper only peer-supports React 17). WYSIWYG + markdown
 * tabs, built-in toolbar, and an image hook wired to the post's presign→commit uploader so authors
 * can drop / paste / pick images inline. The JS is dynamically imported inside the effect so it
 * never evaluates during SSR; the component renders just a host div on the server.
 */
type ToastInstance = {
  getMarkdown: () => string;
  exec: (command: string, payload?: unknown) => void;
  insertToolbarItem: (
    pos: { groupIndex: number; itemIndex: number },
    item: Record<string, unknown>,
  ) => void;
  destroy: () => void;
};

export function MarkdownEditor({
  initialValue,
  onChange,
  onUploadImage,
}: {
  initialValue: string;
  onChange: (markdown: string) => void;
  onUploadImage: (file: Blob) => Promise<string>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onUploadRef = useRef(onUploadImage);
  onChangeRef.current = onChange;
  onUploadRef.current = onUploadImage;

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
            } catch {
              // The parent's uploader surfaces the error; returning without calling back keeps the
              // editor from embedding a base64 blob.
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

      // 형광펜 button — runs the highlightPlugin's "highlight" command (background-color span).
      try {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "toastui-editor-toolbar-icons";
        btn.style.margin = "0";
        btn.style.backgroundImage = "none";
        btn.style.fontSize = "15px";
        btn.textContent = "🖍";
        btn.setAttribute("aria-label", "Highlight");
        btn.addEventListener("click", () => editor?.exec("highlight"));
        // Next to the color picker (group 0) so both stay visible — not in the overflow group.
        editor.insertToolbarItem(
          { groupIndex: 0, itemIndex: 4 },
          { name: "highlight", tooltip: "Highlight", el: btn },
        );
      } catch {
        /* toolbar shape changed — skip rather than break the editor */
      }
    });
    return () => {
      cancelled = true;
      editor?.destroy();
    };
    // Mount once; `initialValue` is already loaded before this renders (the page gates on loading).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="h-full" />;
}
