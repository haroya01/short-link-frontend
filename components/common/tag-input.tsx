"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { addTag, normalizeTag, type TagLimits } from "@/lib/tag-entry";

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  limits: TagLimits;
  placeholder?: string;
  suggestions?: string[];
  autoFocus?: boolean;
  disabled?: boolean;
};

export function TagInput({ tags, onChange, limits, placeholder, suggestions, autoFocus, disabled = false }: Props) {
  const t = useTranslations("tags");
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const atMax = tags.length >= limits.max;

  function commit(raws: string[]) {
    let next = tags;
    for (const raw of raws) next = addTag(next, raw, limits);
    if (next !== tags) onChange(next);
  }

  // A Korean IME can commit the comma without a reliable keydown, so split on the value instead.
  function onChangeValue(v: string) {
    if (v.includes(",")) {
      const parts = v.split(",");
      commit(parts.slice(0, -1));
      setDraft(parts[parts.length - 1]);
    } else {
      setDraft(v);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      commit([draft]);
      setDraft("");
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function addSuggestion(tag: string) {
    commit([tag]);
    inputRef.current?.focus();
  }

  const query = normalizeTag(draft, limits.maxLen).toLowerCase();
  const filtered = (suggestions ?? [])
    .filter((s) => !tags.some((tag) => tag.toLowerCase() === s.toLowerCase()))
    .filter((s) => query === "" || s.toLowerCase().includes(query))
    .slice(0, 6);

  return (
    <div className="group/tags">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 focus-within:border-accent-400 dark:border-slate-700 dark:focus-within:border-accent-500">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-1 text-[13px] font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-300"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((x) => x !== tag))}
              disabled={disabled}
              className="text-accent-400 hover:text-accent-700"
              aria-label={t("removeTag", { name: tag })}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => onChangeValue(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            commit([draft]);
            setDraft("");
          }}
          disabled={disabled || atMax}
          aria-label={t("label")}
          placeholder={tags.length === 0 ? placeholder : ""}
          autoComplete="off"
          autoCorrect="off"
          data-1p-ignore
          data-lpignore="true"
          className="min-w-[8rem] flex-1 bg-transparent py-1 text-base text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-slate-100 sm:text-sm"
        />
      </div>

      {/* mousedown is prevented so tapping a chip doesn't blur the input first: Safari never focuses a
          clicked button, so the blur would hide the chip mid-click. */}
      {!atMax && filtered.length > 0 && (
        <div className="mt-1.5 hidden flex-wrap gap-1.5 group-focus-within/tags:flex">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addSuggestion(s)}
              disabled={disabled}
              className="focus-ring rounded-full border border-slate-200 px-2.5 py-1 text-[12px] text-slate-500 transition-colors hover:border-accent-400 hover:text-accent-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-accent-500 dark:hover:text-accent-300"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {(atMax || tags.length >= limits.max - 2) && (
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {atMax ? t("maxReached", { max: limits.max }) : ""}
          </span>
          <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            {tags.length}/{limits.max}
          </span>
        </div>
      )}
    </div>
  );
}
