"use client";

import { Avatar } from "@/modules/blog/components/avatar";
import { cn } from "@/lib/utils";
import type { MentionCandidate } from "./api/mention-candidates";

export function MentionSuggestions({
  id,
  candidates,
  active,
  onPick,
  label,
  className,
}: {
  id?: string;
  candidates: MentionCandidate[];
  active: number;
  onPick: (candidate: MentionCandidate) => void;
  label: string;
  className?: string;
}) {
  if (candidates.length === 0) return null;
  return (
    <ul
      id={id}
      role="listbox"
      aria-label={label}
      data-testid="mention-suggestions"
      className={cn(
        "z-20 w-full max-w-xs overflow-hidden rounded-surface border border-slate-200 bg-white py-1 shadow-modal motion-safe:animate-dropdown-in dark:border-slate-800 dark:bg-slate-850",
        className,
      )}
    >
      {candidates.map((c, i) => (
        <li key={c.username} id={id ? `${id}-${i}` : undefined} role="option" aria-selected={i === active}>
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(c);
            }}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2 text-left",
              i === active ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/60",
            )}
          >
            <Avatar src={c.avatarUrl} name={c.username} seed={null} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-medium text-slate-900 dark:text-slate-100">
                {c.displayName ?? c.username}
              </span>
              <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">@{c.username}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
