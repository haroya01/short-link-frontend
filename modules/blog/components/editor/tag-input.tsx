"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  max?: number;
};

/** Chip input: type + Enter/comma to add, Backspace on empty to remove the last. */
export function TagInput({ tags, onChange, placeholder, max = 20 }: Props) {
  const [draft, setDraft] = useState("");

  let pending = tags;
  function add(raw: string) {
    const value = raw.replace(/,/g, "").trim();
    if (!value) return;
    const exists = pending.some((t) => t.toLowerCase() === value.toLowerCase());
    if (!exists && pending.length < max) {
      pending = [...pending, value];
      onChange(pending);
    }
  }

  // Split on comma here so it works regardless of how the comma arrives — typed, pasted, or
  // committed by a Korean IME (where the comma keydown alone is unreliable). The trailing,
  // comma-less fragment stays in the draft.
  function onChangeValue(v: string) {
    if (v.includes(",")) {
      const parts = v.split(",");
      parts.slice(0, -1).forEach(add);
      setDraft(parts[parts.length - 1]);
    } else {
      setDraft(v);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Ignore the Enter that only commits an in-progress IME composition (Korean/Japanese).
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      add(draft);
      setDraft("");
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 focus-within:border-accent-400">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-1 text-[13px] font-medium text-accent-700"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="text-accent-400 hover:text-accent-700"
            aria-label={`remove ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => onChangeValue(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          add(draft);
          setDraft("");
        }}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="min-w-[8rem] flex-1 bg-transparent py-1 text-base outline-none placeholder:text-slate-400 sm:text-sm"
      />
    </div>
  );
}
