"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { Check, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePresence } from "@/hooks/use-presence";
import { cn } from "@/lib/utils";

export type ActionMenuItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onSelect?: () => void;
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
  checked?: boolean;
};

const ITEM_SELECTOR = '[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])';

export function ActionMenu({
  label,
  items,
  triggerVariant = "ghost",
  triggerSize = "icon",
  triggerClassName = "h-11 w-11 text-slate-500 dark:text-slate-400",
}: {
  label: string;
  items: ActionMenuItem[];
  triggerVariant?: "ghost" | "outline";
  triggerSize?: "icon" | "sm" | "lg";
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const { mounted, closing } = usePresence(open, 160);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && mounted) ref.current?.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus();
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const items = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const list = items();
      const index = list.indexOf(document.activeElement as HTMLElement);
      const next = event.key === "ArrowDown" ? (index + 1) % list.length : (index - 1 + list.length) % list.length;
      list[next]?.focus();
    }
    function onFocus(event: FocusEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open]);

  const itemClass = (destructive?: boolean) =>
    cn(
      "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors disabled:opacity-50",
      destructive
        ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
    );

  return (
    <div ref={ref} className="relative">
      <Button
        ref={triggerRef}
        variant={triggerVariant}
        size={triggerSize}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {mounted && (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            "absolute right-0 top-full z-20 mt-1 w-56 origin-top-right rounded-2xl border border-slate-200 bg-white p-1 shadow-float motion-reduce:animate-none dark:border-slate-700 dark:bg-slate-850",
            closing ? "pointer-events-none animate-dropdown-out" : "animate-dropdown-in",
          )}
        >
          {items.map(({ label: itemLabel, icon: Icon, onSelect, href, destructive, disabled, checked }) =>
            href ? (
              <a
                key={itemLabel}
                role="menuitem"
                href={href}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className={itemClass(destructive)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {itemLabel}
              </a>
            ) : (
              <button
                key={itemLabel}
                type="button"
                role={checked === undefined ? "menuitem" : "menuitemcheckbox"}
                aria-checked={checked}
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                  onSelect?.();
                }}
                className={itemClass(destructive)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{itemLabel}</span>
                {checked && <Check aria-hidden className="h-4 w-4 shrink-0 text-accent-700 dark:text-accent-400" />}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
