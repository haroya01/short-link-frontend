"use client";

import { useEffect, useRef } from "react";
import "@toast-ui/editor/dist/toastui-editor.css";

/**
 * Toast UI Editor (vanilla — the React wrapper only peer-supports React 17). WYSIWYG + markdown
 * tabs, built-in toolbar, and an image hook wired to the post's presign→commit uploader so authors
 * can drop / paste / pick images inline. The JS is dynamically imported inside the effect so it
 * never evaluates during SSR; the component renders just a host div on the server.
 */
type ToastInstance = { getMarkdown: () => string; destroy: () => void };

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
    void import("@toast-ui/editor").then(({ default: Editor }) => {
      if (cancelled || !hostRef.current) return;
      editor = new Editor({
        el: hostRef.current,
        height: "100%",
        initialValue: initialValue || "",
        initialEditType: "wysiwyg",
        previewStyle: "tab",
        usageStatistics: false,
        autofocus: false,
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
