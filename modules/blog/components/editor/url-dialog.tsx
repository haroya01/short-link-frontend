"use client";

import { useEffect, useRef, useState } from "react";
import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * In-app URL prompt for the editor's link + embed actions — replaces the native `window.prompt`,
 * which broke the writing flow (OS chrome, no styling, no validation). A small centered dialog with a
 * single URL field; Enter confirms, Esc / backdrop closes. `allowRemove` adds a "remove link" action
 * when editing an existing link.
 */
export function UrlDialog({
  open,
  title,
  placeholder,
  initialValue = "",
  allowRemove = false,
  onClose,
  onSubmit,
  onRemove,
}: {
  open: boolean;
  title: string;
  placeholder: string;
  initialValue?: string;
  allowRemove?: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
  onRemove?: () => void;
}) {
  const t = useTranslations("postEditor.urlDialog");
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    const id = window.setTimeout(() => inputRef.current?.select(), 20);
    return () => window.clearTimeout(id);
  }, [open, initialValue]);

  if (!open) return null;

  const submit = () => {
    const url = value.trim();
    if (!url) return;
    onSubmit(url);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-start justify-center bg-slate-900/30 pt-[18vh] backdrop-blur-[1px] animate-fade-in"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          <Link2 className="h-4 w-4 text-accent-600 dark:text-accent-400" />
          {title}
        </div>
        <input
          ref={inputRef}
          type="url"
          inputMode="url"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); submit(); }
            else if (e.key === "Escape") { e.preventDefault(); onClose(); }
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-accent-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-accent-500"
        />
        <div className="mt-3 flex items-center justify-end gap-2">
          {allowRemove && onRemove && (
            <button
              type="button"
              onClick={() => { onRemove(); onClose(); }}
              className="mr-auto rounded-lg px-3 py-1.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              {t("remove")}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            className="rounded-lg bg-accent-700 px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-800 disabled:opacity-40"
          >
            {t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
