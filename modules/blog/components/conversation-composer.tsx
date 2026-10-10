"use client";

import { useEffect, useRef, type Ref, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CornerDownRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useDockOffset } from "@/hooks/use-dock-offset";
import { useNarrowViewport } from "@/hooks/use-narrow-viewport";
import { Button } from "@/components/ui/button";
import { MentionTextarea } from "@/modules/mentions/mention-textarea";

export const CONVERSATION_MAX_LENGTH = 2000;
const COUNTER_FROM = 200;

export function ConversationComposer({
  value,
  onChange,
  onSubmit,
  label,
  placeholder,
  submitLabel,
  submitting = false,
  replyingTo,
  onCancelReply,
  onClose,
  docked = false,
  onDockHeight,
  textareaRef,
  autoFocus = false,
  maxLength = CONVERSATION_MAX_LENGTH,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  label: string;
  placeholder: string;
  submitLabel: string;
  submitting?: boolean;
  replyingTo?: string | null;
  onCancelReply?: () => void;
  onClose?: () => void;
  docked?: boolean;
  onDockHeight?: (height: number) => void;
  textareaRef?: Ref<HTMLTextAreaElement>;
  autoFocus?: boolean;
  maxLength?: number;
}) {
  const t = useTranslations("comments");
  const tc = useTranslations("common");
  const form = useRef<HTMLFormElement>(null);
  const narrow = useNarrowViewport();
  const floating = docked && narrow;
  const offset = useDockOffset(floating);
  const remaining = maxLength - value.length;
  const over = remaining < 0;
  const canSubmit = !!value.trim() && !over && !submitting;

  useEffect(() => {
    if (!onDockHeight) return;
    const el = form.current;
    if (!floating || !el) {
      onDockHeight(0);
      return;
    }
    const report = () => onDockHeight(el.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => {
      observer.disconnect();
      onDockHeight(0);
    };
  }, [floating, onDockHeight]);

  const node = (
    <form
      ref={form}
      data-testid="conversation-composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      style={floating ? { bottom: offset } : undefined}
      className={cn(
        "rounded-surface border border-slate-200 bg-white px-3 pb-2 pt-2.5 transition-colors focus-within:border-accent-400 dark:border-slate-700 dark:bg-slate-900",
        floating &&
          "fixed inset-x-0 z-50 rounded-none border-x-0 border-b-0 px-4 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-float",
      )}
    >
      {replyingTo && (
        <div className="mb-1.5 flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-400">
          <CornerDownRight aria-hidden className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate" data-testid="composer-replying-to">
            {t("replyingTo", { handle: replyingTo })}
          </span>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              aria-label={t("cancelReply")}
              className="touch-target ml-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full hover:bg-slate-100 focus-ring dark:hover:bg-slate-800"
            >
              <X aria-hidden className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      <MentionTextarea
        ref={textareaRef}
        value={value}
        onValueChange={onChange}
        aria-label={label}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={2}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (canSubmit) onSubmit();
          }
        }}
        className="block max-h-[40dvh] min-h-[2lh] w-full resize-none bg-transparent text-[15px] leading-relaxed text-slate-900 outline-none [field-sizing:content] placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <div className="mt-1.5 flex items-center justify-end gap-3">
        {remaining <= COUNTER_FROM && (
          <span
            data-testid="composer-counter"
            className={cn("text-[12px] tabular-nums", over ? "font-medium text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400")}
          >
            {t("charsLeft", { count: remaining })}
          </span>
        )}
        {onClose && (
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {tc("close")}
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
  return floating ? createPortal(node, document.body) : node;
}

export function focusEnd(ref: RefObject<HTMLTextAreaElement | null>) {
  const el = ref.current;
  if (!el) return;
  el.focus();
  el.setSelectionRange(el.value.length, el.value.length);
}
