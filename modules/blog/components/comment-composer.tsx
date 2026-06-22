"use client";

import { type ReactNode } from "react";
import { RichCommentInput } from "@/modules/blog/components/rich-comment-input";

/**
 * 댓글/답글 입력기 — WYSIWYG 입력기(RichCommentInput) + 제출 버튼·로그인 힌트. 입력칸 자체가 결과를
 * 보여주고(마크다운 기호·미리보기 칸 없음) 저장은 그대로 마크다운으로 round-trip 된다. 값(markdown)
 * in/out 계약은 그대로라 부모(댓글·답글·하이라이트 답글)는 안 바뀐다. 하이라이트 노트(NoteSheet)도
 * 같은 RichCommentInput 을 쓴다.
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
  /** Reply variant — tighter toolbar. */
  compact?: boolean;
  /** Left-aligned slot on the action row (e.g. a login hint). */
  footer?: ReactNode;
}) {
  return (
    <div>
      <RichCommentInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        compact={compact}
        autoFocus={autoFocus}
        rows={rows}
        onSubmitShortcut={() => {
          if (canSubmit) onSubmit();
        }}
      />

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
