"use client";

import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from "react";
import { RichCommentInput } from "@/modules/blog/components/rich-comment-input";

/**
 * 댓글/답글 입력기 — WYSIWYG 입력기(RichCommentInput) + 제출 버튼·로그인 힌트. 입력칸 자체가 결과를
 * 보여주고(마크다운 기호·미리보기 칸 없음) 저장은 그대로 마크다운으로 round-trip 된다. 값(markdown)
 * in/out 계약은 그대로라 부모(댓글·답글·하이라이트 답글)는 안 바뀐다. 하이라이트 노트(NoteSheet)도
 * 같은 RichCommentInput 을 쓴다.
 *
 * `collapsible` — 쉬는 상태를 한 줄 어포던스로 접어 두는 조용한 변형(포스트 댓글·답글). 포커스가
 * 들어오거나 초안이 있으면 편안한 에디터 + 제출/취소로 펼치고, 비었을 때 포커스가 빠지면 다시 한 줄로
 * 접는다. 그 외 표면(하이라이트 답글·노트)은 기본값 그대로 항상 펼침이다.
 */
export function CommentComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  submitLabel,
  cancelLabel,
  submitting = false,
  canSubmit,
  rows = 3,
  autoFocus = false,
  compact = false,
  collapsible = false,
  onCancel,
  footer,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  submitLabel: string;
  /** Shown next to submit while expanded (collapsible only). */
  cancelLabel?: string;
  submitting?: boolean;
  /** Whether the submit button is enabled (login-gated surfaces keep it tappable to start auth). */
  canSubmit: boolean;
  rows?: number;
  autoFocus?: boolean;
  /** Reply variant — tighter toolbar. */
  compact?: boolean;
  /** Quiet rest state — a one-line field that expands on focus / while a draft exists. */
  collapsible?: boolean;
  /** Extra work the Cancel button should do (e.g. close the reply slot). Runs after the field clears. */
  onCancel?: () => void;
  /** Left-aligned slot on the action row (e.g. a login hint). */
  footer?: ReactNode;
}) {
  // `engaged` = the user has focused the field this session; combined with a live draft it decides
  // whether the editor is open. A ref mirrors focus so the "value cleared from outside" effect (after
  // a successful submit) can tell a real exit from our own keystrokes without an extra render.
  const [engaged, setEngaged] = useState(autoFocus);
  const focusWithin = useRef(autoFocus);
  const hasDraft = value.trim().length > 0;
  const expanded = collapsible ? engaged || hasDraft : true;

  // The host clears `value` on a successful submit. If focus has already left the composer by then,
  // fall back to the collapsed rest state instead of leaving an empty open editor behind.
  useEffect(() => {
    if (collapsible && !hasDraft && !focusWithin.current) setEngaged(false);
  }, [collapsible, hasDraft]);

  function handleFocus() {
    focusWithin.current = true;
    if (collapsible) setEngaged(true);
  }
  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    // Focus moving between the toolbar / editor / buttons stays inside the composer — only a real
    // exit (relatedTarget outside, or null) collapses it, and only when there's nothing to keep open.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    focusWithin.current = false;
    if (collapsible && !submitting && !hasDraft) setEngaged(false);
  }
  function cancel() {
    onChange("");
    focusWithin.current = false;
    setEngaged(false);
    onCancel?.();
  }

  const actions = (
    <div className="mt-2 flex items-center justify-between gap-3">
      <span className="text-[12px] text-slate-500 dark:text-slate-400">{footer}</span>
      <div className="flex shrink-0 items-center gap-2">
        {collapsible && cancelLabel ? (
          <button
            type="button"
            onClick={cancel}
            className={`rounded-lg font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-ring dark:text-slate-300 dark:hover:bg-slate-800 ${
              compact ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm"
            }`}
          >
            {cancelLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !canSubmit}
          className={`rounded-lg bg-accent-700 font-medium text-white transition-colors hover:bg-accent-800 focus-ring disabled:opacity-50 ${
            compact ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm"
          }`}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div onFocus={collapsible ? handleFocus : undefined} onBlur={collapsible ? handleBlur : undefined}>
      <RichCommentInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        compact={compact}
        autoFocus={autoFocus}
        rows={rows}
        expanded={expanded}
        maxHeight={collapsible ? "40vh" : undefined}
        onSubmitShortcut={() => {
          if (canSubmit) onSubmit();
        }}
      />

      {/* Submit / cancel live in the expanded state only; in collapsible mode they reveal with the
          same grid-rows height transition as the toolbar so the whole field grows as one. */}
      {collapsible ? (
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-[var(--ease)] motion-reduce:transition-none ${
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className={`overflow-hidden ${expanded ? "" : "invisible"}`}>{actions}</div>
        </div>
      ) : (
        actions
      )}
    </div>
  );
}
