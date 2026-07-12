"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { addTag, MAX_TAGS, normalizeTag } from "@/modules/blog/lib/tag-normalize";

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  max?: number;
  /** One-tap suggestions (followed + popular tags). Filtered by the current draft; added tags hidden. */
  suggestions?: string[];
  /** Focus the field on mount — the canvas affordance expands straight into typing. Off by default. */
  autoFocus?: boolean;
};

/**
 * Chip input: type + Enter/comma to add, Backspace on empty to remove the last, blur commits the draft.
 * Entries are normalized (leading `#` stripped, length-capped, case-insensitive dedupe) so a tag stores
 * the same on web and in the app. Suggestions render as quiet ghost chips below; a `n/max` counter and a
 * soft message at the cap replace the old silent drop.
 */
export function TagInput({ tags, onChange, placeholder, max = MAX_TAGS, suggestions, autoFocus }: Props) {
  const t = useTranslations("tags");
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const atMax = tags.length >= max;

  /** Commit one or more raw entries; each is normalized + deduped through addTag. */
  function commit(raws: string[]) {
    let next = tags;
    for (const raw of raws) next = addTag(next, raw, max);
    if (next !== tags) onChange(next);
  }

  // Split on comma here so it works regardless of how the comma arrives — typed, pasted, or committed
  // by a Korean IME (where the comma keydown alone is unreliable). The trailing, comma-less fragment
  // stays in the draft.
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
    // Ignore the Enter that only commits an in-progress IME composition (Korean/Japanese).
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

  // Suggestions the author hasn't added yet, prefix/substring-filtered by the draft (case-insensitive).
  // Normalize the draft the same way an entry would be so "#dev" filters like "dev".
  const query = normalizeTag(draft).toLowerCase();
  const filtered = (suggestions ?? [])
    .filter((s) => !tags.some((tag) => tag.toLowerCase() === s.toLowerCase()))
    .filter((s) => query === "" || s.toLowerCase().includes(query))
    .slice(0, 8);

  return (
    <div>
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
          disabled={atMax}
          aria-label={t("label")}
          placeholder={tags.length === 0 ? placeholder : ""}
          // No mobile autofill (address/card/wallet) bar on a tag field.
          autoComplete="off"
          autoCorrect="off"
          data-1p-ignore
          data-lpignore="true"
          className="min-w-[8rem] flex-1 bg-transparent py-1 text-base text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-slate-100 sm:text-sm"
        />
      </div>

      {/* Ghost suggestion chips — one tap to add. Quiet by design: bordered slate, brand-green on hover. */}
      {!atMax && filtered.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addSuggestion(s)}
              className="focus-ring rounded-full border border-slate-200 px-2.5 py-1 text-[12px] text-slate-500 transition-colors hover:border-accent-400 hover:text-accent-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-accent-500 dark:hover:text-accent-300"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {/* Live count so the cap never surprises; a soft note replaces the old silent drop at the limit. */}
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {atMax ? t("maxReached", { max }) : ""}
        </span>
        <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-500">
          {tags.length}/{max}
        </span>
      </div>
    </div>
  );
}
