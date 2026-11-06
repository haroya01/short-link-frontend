"use client";

import type { ReactNode } from "react";
import { ChevronsUpDown } from "lucide-react";
import { GROUPED_CELL, GROUPED_ROW } from "@/components/common/grouped-list";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LABEL = "shrink-0 text-sm font-medium text-slate-900 dark:text-slate-100";
const VALUE = "min-w-0 text-sm text-slate-500 dark:text-slate-400";

export function ValueRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={GROUPED_CELL}>
      <span className={LABEL}>{label}</span>
      <span className={cn(VALUE, "truncate text-right tabular-nums")}>{children}</span>
    </div>
  );
}

export type SelectOption = { value: string; label: string; lang?: string };

export function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (next: string) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <label
      className={cn(
        GROUPED_ROW,
        "relative cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-[rgb(var(--focus-ink))]",
      )}
    >
      <span className={LABEL}>{label}</span>
      <span className={cn(VALUE, "flex items-center gap-1")}>
        <span lang={current?.lang} className="truncate">
          {current?.label ?? value}
        </span>
        <ChevronsUpDown aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 dark:[color-scheme:dark]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} lang={o.lang}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ActionRow({
  children,
  onClick,
  danger = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        GROUPED_ROW,
        "w-full text-left text-sm font-medium disabled:opacity-50",
        danger ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100",
      )}
    >
      {children}
    </button>
  );
}

export function NoteRow({ children }: { children: ReactNode }) {
  return <p className={cn(GROUPED_CELL, "text-sm text-slate-500 dark:text-slate-400")}>{children}</p>;
}

export function ErrorRow({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  return (
    <div role="alert" className={GROUPED_CELL}>
      <span className="min-w-0 text-sm text-slate-500 dark:text-slate-400">{message}</span>
      <Button size="sm" variant="outline" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}

export function BlockRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-3 px-4 py-3", className)}>{children}</div>;
}
