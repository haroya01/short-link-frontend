"use client";

import { useLayoutEffect, useRef } from "react";

/** The title wraps like the published headline; Enter continues in the body. */
export function EditorTitle({ value, onChange, onContinue, placeholder }: {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    const field = ref.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  };
  useLayoutEffect(resize, [value]);
  useLayoutEffect(() => {
    const field = ref.current;
    if (!field || typeof ResizeObserver === "undefined") return;
    let width = field.clientWidth;
    const observer = new ResizeObserver(() => {
      if (field.clientWidth !== width) {
        width = field.clientWidth;
        resize();
      }
    });
    observer.observe(field);
    let mounted = true;
    void document.fonts?.ready.then(() => { if (mounted) resize(); });
    return () => { mounted = false; observer.disconnect(); };
  }, []);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[\r\n]+/g, " "))}
      onKeyDown={(e) => {
        // Korean/Japanese composition confirmation must stay in the title (Safari also uses 229).
        if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return;
        e.preventDefault();
        onContinue();
      }}
      maxLength={200}
      autoComplete="off"
      enterKeyHint="next"
      data-1p-ignore
      data-lpignore="true"
      // The mobile 16px form-control floor must not shrink an editorial headline.
      className="mt-6 max-h-[30dvh] w-full shrink-0 resize-none overflow-y-auto border-0 bg-transparent p-0 !text-headline-post font-bold tracking-headline text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-100 dark:placeholder:text-slate-600 sm:!text-headline-post-lg"
      placeholder={placeholder}
      aria-label={placeholder}
    />
  );
}
