"use client";

import { forwardRef, useId, useImperativeHandle, useRef, useState, type TextareaHTMLAttributes } from "react";
import { useTranslations } from "next-intl";
import { applyMention, mentionTokenAt, type MentionToken } from "./mention-token";
import { MentionSuggestions } from "./mention-suggestions";
import { useMentionCandidates } from "./use-mention-candidates";
import type { MentionCandidate } from "./api/mention-candidates";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  wrapperClassName?: string;
};

export const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(function MentionTextarea(
  { value, onValueChange, onKeyDown, onBlur, wrapperClassName, ...rest },
  forwarded,
) {
  const t = useTranslations("mentions");
  const listId = useId();
  const inner = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(forwarded, () => inner.current as HTMLTextAreaElement);
  const [token, setToken] = useState<MentionToken | null>(null);
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const candidates = useMentionCandidates(token?.query ?? null, true);
  const open = token != null && candidates.length > 0;

  const read = (el: HTMLTextAreaElement) => {
    const at = el.selectionStart ?? 0;
    setCaret(at);
    setToken(el.selectionStart === el.selectionEnd ? mentionTokenAt(el.value, at) : null);
    setActive(0);
  };

  const pick = (candidate: MentionCandidate) => {
    if (!token) return;
    const next = applyMention(value, token, caret, candidate.username);
    onValueChange(next.text);
    setToken(null);
    requestAnimationFrame(() => {
      inner.current?.focus();
      inner.current?.setSelectionRange(next.caret, next.caret);
    });
  };

  return (
    <div className={wrapperClassName ?? "relative w-full"}>
      <textarea
        ref={inner}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          read(e.target);
        }}
        onSelect={(e) => read(e.currentTarget)}
        onBlur={(e) => {
          setToken(null);
          onBlur?.(e);
        }}
        onKeyDown={(e) => {
          if (open && !e.nativeEvent.isComposing) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const step = e.key === "ArrowDown" ? 1 : -1;
              setActive((i) => (i + step + candidates.length) % candidates.length);
              return;
            }
            if ((e.key === "Enter" && !e.metaKey && !e.ctrlKey) || e.key === "Tab") {
              e.preventDefault();
              pick(candidates[active]);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setToken(null);
              return;
            }
          }
          onKeyDown?.(e);
        }}
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        {...rest}
      />
      {open && (
        <MentionSuggestions
          id={listId}
          className="absolute left-0 top-full mt-1"
          candidates={candidates}
          active={active}
          onPick={pick}
          label={t("suggestions")}
        />
      )}
    </div>
  );
});
