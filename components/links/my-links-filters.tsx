"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ListFilter, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MyLinksFilters } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

type Props = {
  filters: MyLinksFilters;
  onChange: (next: MyLinksFilters) => void;
};

const EXPIRY_OPTIONS: NonNullable<MyLinksFilters["expiry"]>[] = [
  "ACTIVE",
  "NEVER",
  "HAS_EXPIRY",
  "EXPIRING_SOON",
  "EXPIRED",
];

function patcher(filters: MyLinksFilters, onChange: Props["onChange"]) {
  return (p: Partial<MyLinksFilters>) => onChange({ ...filters, ...p, after: undefined });
}

export function MyLinksFiltersToggle({
  filters,
  onChange,
  open,
  onOpenChange,
}: Props & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("dashboard.filters");
  const activeCount = countActive(filters);
  const patch = patcher(filters, onChange);

  function clearAll() {
    onChange({ size: filters.size, sort: filters.sort, dir: filters.dir, q: filters.q });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="max-sm:px-2.5"
      >
        <ListFilter aria-hidden className="h-4 w-4 sm:hidden" />
        <span className="max-sm:sr-only">{t("toggle")}</span>
        {activeCount > 0 && (
          <span className="rounded-full bg-slate-900 dark:bg-white px-1.5 py-0.5 text-[10px] font-semibold text-white dark:text-slate-900">
            {activeCount}
          </span>
        )}
        <ChevronDown
          aria-hidden
          className={cn("hidden h-3.5 w-3.5 transition sm:block", open && "rotate-180")}
        />
      </Button>

      {filters.tag && (
        <Chip label={`#${filters.tag}`} onRemove={() => patch({ tag: undefined })} />
      )}
      {filters.domain && (
        <Chip
          label={`${t("domain")}: ${filters.domain}`}
          onRemove={() => patch({ domain: undefined })}
        />
      )}
      {filters.expiry && filters.expiry !== "ACTIVE" && (
        <Chip
          label={t(`expiry.${filters.expiry}`)}
          onRemove={() => patch({ expiry: undefined })}
        />
      )}
      {filters.createdAfter && (
        <Chip
          label={`${t("after")}: ${formatDate(filters.createdAfter)}`}
          onRemove={() => patch({ createdAfter: undefined })}
        />
      )}
      {filters.createdBefore && (
        <Chip
          label={`${t("before")}: ${formatDate(filters.createdBefore)}`}
          onRemove={() => patch({ createdBefore: undefined })}
        />
      )}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="focus-ring ml-auto rounded-sm text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          {t("clearAll")}
        </button>
      )}
    </div>
  );
}

export function MyLinksFiltersPanel({ filters, onChange, tagOptions }: Props & { tagOptions?: string[] }) {
  const t = useTranslations("dashboard.filters");
  const patch = patcher(filters, onChange);
  const [domain, setDomain] = useTypedFilter(filters.domain, (next) => patch({ domain: next }));
  const [tag, setTag] = useTypedFilter(filters.tag, (next) => patch({ tag: next }));

  return (
    <div data-testid="filters-panel" className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 motion-safe:animate-[result-beat_260ms_var(--ease)] dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
      <Field label={t("domain")}>
        <Input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
        />
      </Field>

      <Field label={t("tag")}>
        {tagOptions && tagOptions.length > 0 ? (
          <select
            value={filters.tag ?? ""}
            onChange={(e) => patch({ tag: e.target.value || undefined })}
            className="block h-11 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus-ring"
          >
            <option value="">{t("any")}</option>
            {tagOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          <Input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder={t("tagPlaceholder")}
          />
        )}
      </Field>

      <Field label={t("expiryLabel")}>
        <select
          value={filters.expiry ?? ""}
          onChange={(e) =>
            patch({
              expiry:
                (e.target.value as MyLinksFilters["expiry"]) || undefined,
            })
          }
          className="block h-11 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus-ring"
        >
          <option value="">{t("any")}</option>
          {EXPIRY_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {t(`expiry.${value}`)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("dateRange")}>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-1">
          <Input
            type="date"
            className="min-w-0"
            value={dateOnly(filters.createdAfter)}
            onChange={(e) =>
              patch({ createdAfter: toIsoStart(e.target.value) })
            }
          />
          <span aria-hidden className="hidden text-slate-400 dark:text-slate-400 sm:block">–</span>
          <Input
            type="date"
            className="min-w-0"
            value={dateOnly(filters.createdBefore)}
            onChange={(e) =>
              patch({ createdBefore: toIsoEnd(e.target.value) })
            }
          />
        </div>
      </Field>
    </div>
  );
}

function useTypedFilter(committed: string | undefined, commit: (next: string | undefined) => void) {
  const [text, setText] = useState(committed ?? "");
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);
  useEffect(() => {
    setText((current) => (current.trim() === (committed ?? "") ? current : committed ?? ""));
  }, [committed]);
  useEffect(() => {
    const next = text.trim() || undefined;
    if (next === committed) return;
    const id = setTimeout(() => commitRef.current(next), 300);
    return () => clearTimeout(id);
  }, [text, committed]);
  return [text, setText] as const;
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const t = useTranslations("dashboard.filters");
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="focus-ring rounded-full text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
        aria-label={t("remove", { label })}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function countActive(f: MyLinksFilters): number {
  let n = 0;
  if (f.tag) n++;
  if (f.domain) n++;
  if (f.expiry && f.expiry !== "ACTIVE") n++;
  if (f.createdAfter) n++;
  if (f.createdBefore) n++;
  return n;
}

// The inverse of toIsoStart/toIsoEnd: the LOCAL calendar date of the stored instant (slicing the UTC
// ISO string shifted every pick back a day east of UTC).
function dateOnly(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n, i) => String(n).padStart(i ? 2 : 4, "0")).join("-");
}

function toIsoStart(date: string): string | undefined {
  if (!date) return undefined;
  return new Date(date + "T00:00:00").toISOString();
}

function toIsoEnd(date: string): string | undefined {
  if (!date) return undefined;
  return new Date(date + "T23:59:59.999").toISOString();
}
