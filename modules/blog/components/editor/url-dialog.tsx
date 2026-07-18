"use client";

import { useEffect, useRef, useState } from "react";
import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePresence } from "@/hooks/use-presence";

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
  // Hold the dialog mounted through a brief fade-out on close instead of popping.
  const { mounted: present, closing } = usePresence(open, 160);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    const id = window.setTimeout(() => inputRef.current?.select(), 20);
    return () => window.clearTimeout(id);
  }, [open, initialValue]);

  if (!present) return null;

  const submit = () => {
    const url = value.trim();
    if (!url) return;
    onSubmit(url);
    onClose();
  };

  return (
    <div
      // 나가는 중인 오버레이는 시각적으로도, 접근성 트리에서도 이미 없는 존재다 — aria-hidden 이 없으면
      // 보조기술(과 role 셀렉터)이 퇴장 애니메이션 동안 유령 다이얼로그를 계속 본다.
      aria-hidden={closing || undefined}
      className={`fixed inset-0 z-[60] grid place-items-start justify-center bg-slate-900/30 pt-[18vh] backdrop-blur-[1px] motion-reduce:animate-none ${
        // 닫히는 160ms 동안 이 전면 백드롭이 클릭을 삼키면 안 된다 — 삽입 직후 본문을 클릭한
        // 타이핑이 통째로 증발하는 원인이었다(모든 use-presence 전면 오버레이 공통 규칙).
        closing ? "pointer-events-none animate-fade-out" : "animate-fade-in"
      }`}
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
