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

  function add(raw: string) {
    const value = raw.trim().replace(/,$/, "").trim();
    if (!value) return;
    const exists = tags.some((t) => t.toLowerCase() === value.toLowerCase());
    if (!exists && tags.length < max) onChange([...tags, value]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
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
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="min-w-[8rem] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-slate-400"
      />
    </div>
  );
}
