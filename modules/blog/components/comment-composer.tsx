"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bold, Code2, Italic, Link as LinkIcon, List, Quote, type LucideIcon } from "lucide-react";
import { CommentBody } from "@/modules/blog/components/comment-markdown";

/**
 * 댓글/답글 입력기 — raw textarea 위에 가벼운 서식 툴바와 라이브 미리보기를 얹어, 마크다운 문법을
 * 모르는 사람도 굵게/인용/리스트를 버튼으로 넣고 결과를 *치는 즉시* 본다. 본문 에디터(Tiptap)와 달리
 * 댓글은 가볍게 유지해야 해서 textarea 를 그대로 두되(모바일 키보드가 가장 안정적), 본문과 똑같은
 * 댓글 마크다운 렌더러로 미리보기를 그린다 → 발행 후의 모습과 1:1. 댓글과 답글이 같은 입력기를 쓴다.
 */
export function CommentComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  submitLabel,
  submitting = false,
  canSubmit,
  rows = 3,
  autoFocus = false,
  compact = false,
  footer,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  submitLabel: string;
  submitting?: boolean;
  /** Whether the submit button is enabled (login-gated surfaces keep it tappable to start auth). */
  canSubmit: boolean;
  rows?: number;
  autoFocus?: boolean;
  /** Reply variant — tighter toolbar + preview. */
  compact?: boolean;
  /** Left-aligned slot on the action row (e.g. a login hint). */
  footer?: ReactNode;
}) {
  const t = useTranslations("comments");
  const locale = useLocale();
  const ref = useRef<HTMLTextAreaElement>(null);
  // A pending selection to restore AFTER the controlled value re-renders (so the caret lands inside the
  // markers we just inserted instead of jumping to the end).
  const pendingSel = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!pendingSel.current || !ref.current) return;
    const [s, e] = pendingSel.current;
    pendingSel.current = null;
    const ta = ref.current;
    ta.focus();
    ta.setSelectionRange(s, e);
  }, [value]);

  function apply(next: string, selStart: number, selEnd: number) {
    pendingSel.current = [selStart, selEnd];
    onChange(next);
  }

  // Wrap the selection (or the caret) in inline markers — typing then replaces the highlighted body.
  function wrapInline(before: string, after: string) {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const mid = value.slice(s, e);
    const next = value.slice(0, s) + before + mid + after + value.slice(e);
    if (mid) apply(next, s + before.length, e + before.length);
    else apply(next, s + before.length, s + before.length);
  }

  // Turn the selected text into a link, leaving the URL placeholder selected so it's the next thing typed.
  function wrapLink() {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const label = value.slice(s, e) || t("linkText");
    const url = "https://";
    const inserted = `[${label}](${url})`;
    const next = value.slice(0, s) + inserted + value.slice(e);
    const urlStart = s + 1 + label.length + 2; // after `](`
    apply(next, urlStart, urlStart + url.length);
  }

  // Prefix every line the selection touches with a block marker (list / quote).
  function prefixLines(marker: string) {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const lineEnd = value.indexOf("\n", e);
    const end = lineEnd === -1 ? value.length : lineEnd;
    const block = value
      .slice(lineStart, end)
      .split("\n")
      .map((l) => (l.startsWith(marker) ? l : marker + l))
      .join("\n");
    const next = value.slice(0, lineStart) + block + value.slice(end);
    apply(next, lineStart, lineStart + block.length);
  }

  const tools: { icon: LucideIcon; label: string; run: () => void }[] = [
    { icon: Bold, label: t("bold"), run: () => wrapInline("**", "**") },
    { icon: Italic, label: t("italic"), run: () => wrapInline("*", "*") },
    { icon: Code2, label: t("code"), run: () => wrapInline("`", "`") },
    { icon: LinkIcon, label: t("link"), run: wrapLink },
    { icon: List, label: t("list"), run: () => prefixLines("- ") },
    { icon: Quote, label: t("quote"), run: () => prefixLines("> ") },
  ];

  const showPreview = value.trim().length > 0;

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-slate-200 transition-colors focus-within:border-accent-400 dark:border-slate-700 dark:focus-within:border-accent-500">
        <div className="flex items-center gap-0.5 border-b border-slate-100 px-1.5 py-1 dark:border-slate-800">
          {tools.map((it, i) => (
            <button
              key={i}
              type="button"
              aria-label={it.label}
              title={it.label}
              // onMouseDown+preventDefault keeps the textarea selection alive through the click so the
              // markers wrap what was selected (a plain onClick would blur and collapse it first).
              onMouseDown={(ev) => {
                ev.preventDefault();
                it.run();
              }}
              className="touch-target focus-ring grid h-8 w-8 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <it.icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </button>
          ))}
        </div>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={2000}
          rows={rows}
          autoFocus={autoFocus}
          aria-label={placeholder}
          placeholder={placeholder}
          className="w-full resize-y bg-transparent px-4 py-3 text-[15px] leading-relaxed outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      {showPreview && (
        <div className="mt-2 rounded-xl bg-slate-50/70 px-4 py-3 dark:bg-slate-900/40">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            <span aria-hidden className="h-1 w-1 rounded-full bg-accent-600" />
            {t("preview")}
          </div>
          <div className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
            <CommentBody text={value} locale={locale} />
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[12px] text-slate-500 dark:text-slate-400">{footer}</span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !canSubmit}
          className={`shrink-0 rounded-lg bg-accent-700 font-medium text-white transition-colors hover:bg-accent-800 focus-ring disabled:opacity-50 ${
            compact ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm"
          }`}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
