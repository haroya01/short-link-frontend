"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { ExternalLink, Pencil, Unlink } from "lucide-react";
import type { Editor } from "@tiptap/react";

export function LinkActions({
  editor,
  actions,
  onEdit,
  onClose,
}: {
  editor: Editor;
  actions: { href: string; from: number; to: number; rect: DOMRect };
  onEdit: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("postEditor.linkSheet");
  const tu = useTranslations("postEditor.urlDialog");
  const ref = useRef<HTMLDivElement>(null);
  const { href, from, to, rect } = actions;

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const moved = () => {
      const at = editor.state.selection.from;
      if (at < from || at > to) onClose();
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    document.addEventListener("scroll", onClose, true);
    editor.on("selectionUpdate", moved);
    editor.on("update", onClose);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
      document.removeEventListener("scroll", onClose, true);
      editor.off("selectionUpdate", moved);
      editor.off("update", onClose);
    };
  }, [editor, from, to, onClose]);

  const item =
    "focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";
  return createPortal(
    <div
      ref={ref}
      role="group"
      aria-label={t("actions")}
      data-link-actions
      style={{ top: rect.bottom + 6, left: Math.min(Math.max(8, rect.left), window.innerWidth - 280) }}
      className="fixed z-50 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-float animate-fade-in motion-reduce:animate-none dark:border-slate-700 dark:bg-slate-850"
    >
      <button
        type="button"
        className={item}
        onClick={() => {
          window.open(href, "_blank", "noopener,noreferrer");
          onClose();
        }}
      >
        <ExternalLink aria-hidden className="h-3.5 w-3.5" />
        {t("open")}
      </button>
      <button type="button" className={item} onClick={onEdit}>
        <Pencil aria-hidden className="h-3.5 w-3.5" />
        {t("edit")}
      </button>
      <button
        type="button"
        className={`${item} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10`}
        onClick={() => {
          editor.chain().focus().setTextSelection({ from, to }).unsetLink().run();
          onClose();
        }}
      >
        <Unlink aria-hidden className="h-3.5 w-3.5" />
        {tu("remove")}
      </button>
    </div>,
    document.body,
  );
}
