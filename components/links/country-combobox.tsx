"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FREQUENT_COUNTRY_CODES,
  countryOptions,
  matchesCountryQuery,
  type CountryOption,
} from "@/lib/countries";

export const PICKER_SIZE = {
  field: "h-11 px-3 text-base sm:h-8 sm:px-2.5 sm:text-xs",
  md: "px-2 py-1.5 text-xs",
  sm: "h-8 px-2 text-base sm:text-xs",
} as const;

/**
 * Searchable country picker over the full ISO 3166-1 alpha-2 set (250-ish) — the backend accepts them
 * all and GeoIP resolves them all, so the picker must not fabricate a limit. Names are localized via
 * Intl.DisplayNames (lib/countries), flags derived from codepoints; nothing is hardcoded. Frequently
 * picked countries lead the list, then the full A→Z. Shared by the A/B destination country selector
 * and the geo-block picker.
 *
 * A plain <select> can't hold 250 options usefully, so this is a button → portal-rendered popover with
 * a search field and arrow-key navigation. The popover portals to document.body (overlay portal rule:
 * a transformed/overflow-hidden ancestor otherwise clips a position:fixed layer). Escape / click-away
 * close it; focus returns to the trigger.
 */
export function CountryCombobox({
  value,
  onChange,
  disabled,
  size = "md",
  /** Show a leading "any country" option (destination targeting). Omit for the block-list adder. */
  allowAny = false,
  portal = true,
  className,
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  size?: keyof typeof PICKER_SIZE;
  allowAny?: boolean;
  portal?: boolean;
  className?: string;
}) {
  const t = useTranslations("stats.destinations");
  const locale = useLocale();
  const options = useMemo(() => countryOptions(locale), [locale]);
  const byCode = useMemo(() => new Map(options.map((o) => [o.code, o])), [options]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Ordered, filtered rows: frequent countries first (labelled), then the rest A→Z, minus dupes.
  const rows = useMemo<CountryOption[]>(() => {
    const frequent = FREQUENT_COUNTRY_CODES.map((c) => byCode.get(c)).filter(Boolean) as CountryOption[];
    const rest = options.filter((o) => !FREQUENT_COUNTRY_CODES.includes(o.code));
    const ordered = query.trim() ? options : [...frequent, ...rest];
    return ordered.filter((o) => matchesCountryQuery(o, query));
  }, [options, byCode, query]);

  const selected = value ? byCode.get(value.toUpperCase()) : undefined;

  function openPopover() {
    if (disabled) return;
    const r = triggerRef.current?.getBoundingClientRect() ?? null;
    setRect(r);
    setQuery("");
    setActive(0);
    setOpen(true);
  }
  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }
  function pick(code: string) {
    onChange(code);
    close();
  }

  // Focus the search field on open; keep the popover anchored on scroll/resize.
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
    const reposition = () => setRect(triggerRef.current?.getBoundingClientRect() ?? null);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  // Click-away closes (both trigger and popover are excluded).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  // Keep the active row within range as the filter narrows.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, rows.length - 1)));
  }, [rows.length]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[active];
      if (row) pick(row.code);
    }
  }

  const triggerText = allowAny && !value ? t("countryAny") : selected ? `${selected.flag} ${selected.code}` : t("countryPlaceholder");

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : openPopover())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("countryLabel")}
        className={cn(
          "inline-flex items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 transition-colors hover:border-slate-300",
          "focus-ring disabled:opacity-50",
          "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600",
          PICKER_SIZE[size],
          className,
        )}
      >
        <span className={cn("truncate", !selected && !(allowAny && !value) && "text-slate-500 dark:text-slate-400")}>
          {triggerText}
        </span>
        <ChevronDown
          className={cn("shrink-0 text-slate-400 dark:text-slate-400", size === "md" ? "h-3 w-3" : "h-4 w-4 sm:h-3 sm:w-3")}
          aria-hidden
        />
      </button>

      {open &&
        rect &&
        typeof document !== "undefined" &&
        inLayer(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={t("countryLabel")}
            onKeyDown={onKeyDown}
            className="fixed z-50 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-float dark:border-slate-700 dark:bg-slate-850"
            style={{
              top: Math.min(rect.bottom + 6, window.innerHeight - 340),
              left: Math.min(rect.left, window.innerWidth - 256 - 8),
            }}
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("countrySearch")}
                aria-label={t("countrySearch")}
                aria-controls={listId}
                className="w-full bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>

            <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
              {allowAny && !query.trim() && (
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={!value}
                    onClick={() => pick("")}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span className="flex-1">{t("countryAny")}</span>
                    {!value && <Check className="h-3.5 w-3.5 text-slate-900 dark:text-slate-100" aria-hidden />}
                  </button>
                </li>
              )}
              {rows.length === 0 ? (
                <li className="px-3 py-3 text-center text-[12px] text-slate-500 dark:text-slate-400">
                  {t("countryNoResults")}
                </li>
              ) : (
                rows.map((o, i) => {
                  const isSelected = o.code === value?.toUpperCase();
                  return (
                    <li key={o.code}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => pick(o.code)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px]",
                          i === active ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/60",
                        )}
                      >
                        <span aria-hidden className="text-[15px] leading-none">{o.flag}</span>
                        <span className="flex-1 truncate text-slate-800 dark:text-slate-200">{o.name}</span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{o.code}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-slate-900 dark:text-slate-100" aria-hidden />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
        )}
    </>
  );

  function inLayer(node: React.ReactElement) {
    return portal ? createPortal(node, document.body) : node;
  }
}
