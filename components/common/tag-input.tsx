"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  suggestions?: string[];
  maxTags?: number;
};

export function TagInput({ value, onChange, disabled, suggestions, maxTags = 20 }: Props) {
  const t = useTranslations("tags");
  const [draft, setDraft] = useState("");

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) return;
    if (value.length >= maxTags) return;
    onChange([...value, trimmed]);
    setDraft("");
  }

  function removeTag(name: string) {
    onChange(value.filter((v) => v !== name));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && draft.length === 0 && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  const filtered = suggestions
    ? suggestions
        .filter((s) => !value.includes(s))
        .filter((s) => draft.length === 0 || s.toLowerCase().includes(draft.toLowerCase()))
        .slice(0, 6)
    : [];

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-accent-500 dark:focus-within:ring-accent-500/30">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={disabled}
              className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
              aria-label={t("removeTag", { name: tag })}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(draft)}
          disabled={disabled || value.length >= maxTags}
          placeholder={value.length === 0 ? t("inputPlaceholder") : ""}
          className="flex-1 min-w-[80px] border-0 bg-transparent p-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:bg-transparent dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              disabled={disabled}
              className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      {value.length >= maxTags && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("maxReached", { max: maxTags })}</p>
      )}
    </div>
  );
}
