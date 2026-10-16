"use client";

import { useRef, type KeyboardEvent, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { normalizeRemoteQuery } from "@/modules/notes/lib/remote-handle";

export function DomainCompletions({
  handles,
  typed,
  onPick,
  inputRef,
  dense = false,
}: {
  handles: string[];
  typed: string;
  onPick: (handle: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  dense?: boolean;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  if (handles.length === 0) return null;
  const start = normalizeRemoteQuery(typed);
  const lead = start.startsWith("@") ? start : `@${start}`;

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (!inputRef) return;
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const index = rows.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown" && index < rows.length - 1) {
      event.preventDefault();
      rows[index + 1]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      (index > 0 ? rows[index - 1] : inputRef.current)?.focus();
    }
  }

  return (
    <ul
      ref={listRef}
      data-testid="domain-completions"
      onKeyDown={onKeyDown}
      className="border-b border-slate-100 p-1 dark:border-slate-800"
    >
      {handles.map((handle) => {
        const typedPart = handle.toLowerCase().startsWith(lead.toLowerCase()) ? handle.slice(0, lead.length) : "";
        return (
          <li key={handle}>
            <button
              type="button"
              data-domain-completion
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onPick(handle)}
              className={cn(
                "focus-ring block w-full truncate rounded-surface px-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                dense ? "py-2 text-[13px]" : "py-2.5 text-[15px]",
              )}
            >
              <span className="text-slate-900 dark:text-slate-100">{typedPart}</span>
              <span className="text-slate-500 dark:text-slate-400">{handle.slice(typedPart.length)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
