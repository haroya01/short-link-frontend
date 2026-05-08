"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";
import {
  addDestination,
  deleteDestination,
  listDestinations,
  updateDestination,
} from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import type { DestinationClick, DestinationSummary } from "@/types";

/**
 * A/B variant manager for a link. Combines configured variants (with weight/label/enabled) with
 * the per-destination click counts from stats so owners see "did B beat A" without leaving the
 * page.
 */
export function LinkDestinationsSection({
  shortCode,
  destinationClicks,
  onChanged,
}: {
  shortCode: string;
  destinationClicks: DestinationClick[];
  onChanged: () => void;
}) {
  const t = useTranslations("stats.destinations");
  const errorMessage = useApiErrorMessage();
  const { toast } = useToast();
  const [items, setItems] = useState<DestinationSummary[] | null>(null);
  const [url, setUrl] = useState("");
  const [weight, setWeight] = useState(50);
  const [label, setLabel] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listDestinations(shortCode)
      .then((res) => {
        if (!cancelled) setItems(res);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [shortCode]);

  async function refresh() {
    try {
      const res = await listDestinations(shortCode);
      setItems(res);
      onChanged();
    } catch {
      // soft fail
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await addDestination(
        shortCode,
        url.trim(),
        weight,
        label.trim() || undefined,
        country || undefined,
      );
      setUrl("");
      setLabel("");
      setWeight(50);
      setCountry("");
      await refresh();
    } catch (err) {
      toast(errorMessage(err, t("addFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: number, payload: Parameters<typeof updateDestination>[2]) {
    try {
      await updateDestination(shortCode, id, payload);
      await refresh();
    } catch (err) {
      toast(errorMessage(err, t("updateFailed")), "error");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await deleteDestination(shortCode, id);
      await refresh();
      toast(t("deleted"), "success");
    } catch (err) {
      toast(errorMessage(err, t("deleteFailed")), "error");
    }
  }

  const totalClicks = destinationClicks.reduce((sum, d) => sum + d.count, 0);
  const clicksByDestId = new Map<number, number>();
  let defaultClicks = 0;
  for (const dc of destinationClicks) {
    if (dc.destinationId == null) defaultClicks += dc.count;
    else clicksByDestId.set(dc.destinationId, dc.count);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">{t("title")}</h2>
        <p className="mt-1 text-xs text-slate-500">{t("description")}</p>
      </div>

      <form onSubmit={handleAdd} className="grid gap-2 sm:grid-cols-[1fr_100px_120px_120px_auto]">
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://variant-a.example.com"
          required
          disabled={busy}
        />
        <Input
          type="number"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value) || 1)}
          min={1}
          max={100}
          placeholder={t("weight")}
          disabled={busy}
        />
        <Input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("labelPlaceholder")}
          maxLength={40}
          disabled={busy}
        />
        <CountrySelect value={country} onChange={setCountry} disabled={busy} t={t} />
        <Button type="submit" size="sm" variant="accent" disabled={busy || !url.trim()}>
          {busy ? t("adding") : t("add")}
        </Button>
      </form>

      <div className="mt-4 space-y-2">
        {defaultClicks > 0 && (
          <DestinationRow
            label={t("controlLabel")}
            url=""
            count={defaultClicks}
            total={totalClicks}
            isControl
          />
        )}

        {items === null ? (
          <p className="text-xs text-slate-400">{t("loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-500">{t("empty")}</p>
        ) : (
          items.map((d) => (
            <DestinationRow
              key={d.id}
              label={d.label ?? `#${d.id}`}
              url={d.url}
              count={clicksByDestId.get(d.id) ?? 0}
              total={totalClicks}
              weight={d.weight}
              enabled={d.enabled}
              countryCode={d.countryCode}
              onToggle={() => patch(d.id, { enabled: !d.enabled })}
              onWeightChange={(next) => patch(d.id, { weight: next })}
              onCountryChange={(next) => patch(d.id, { countryCode: next })}
              onDelete={() => handleDelete(d.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function DestinationRow({
  label,
  url,
  count,
  total,
  weight,
  enabled,
  countryCode,
  isControl,
  onToggle,
  onWeightChange,
  onCountryChange,
  onDelete,
}: {
  label: string;
  url: string;
  count: number;
  total: number;
  weight?: number;
  enabled?: boolean;
  countryCode?: string | null;
  isControl?: boolean;
  onToggle?: () => void;
  onWeightChange?: (n: number) => void;
  onCountryChange?: (next: string | null) => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("stats.destinations");
  const pct = total === 0 ? 0 : (count / total) * 100;
  return (
    <div
      className={
        "rounded-md border px-3 py-2 text-xs " +
        (enabled === false
          ? "border-slate-100 bg-slate-50 text-slate-500"
          : "border-slate-200 bg-white")
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-900">{label}</span>
        {isControl && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
            {t("controlBadge")}
          </span>
        )}
        {weight != null && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
            w {weight}
          </span>
        )}
        {countryCode && (
          <span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] text-blue-700">
            {countryFlag(countryCode)} {countryCode}
          </span>
        )}
        {enabled === false && (
          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700">
            {t("disabled")}
          </span>
        )}
        <span className="ml-auto font-mono tabular-nums text-slate-700">
          {count} · {pct.toFixed(1)}%
        </span>
      </div>
      {url && (
        <code
          className="mt-1 block break-all font-mono text-[11px] text-slate-500"
          title={url}
        >
          {url}
        </code>
      )}
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded bg-slate-100">
        <div
          className="h-full bg-accent-600"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {!isControl && (onToggle || onWeightChange || onDelete) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {onWeightChange && weight != null && (
            <input
              type="range"
              min={1}
              max={100}
              value={weight}
              onChange={(e) => onWeightChange(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer accent-slate-900"
              aria-label={t("weight")}
            />
          )}
          {onCountryChange && (
            <RowCountrySelect
              value={countryCode ?? ""}
              onChange={(v) => onCountryChange(v || null)}
              t={t}
            />
          )}
          {onToggle && (
            <Button type="button" size="sm" variant="ghost" onClick={onToggle}>
              {enabled === false ? t("enable") : t("disable")}
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              onClick={onDelete}
            >
              {t("delete")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const COUNTRY_OPTIONS: { code: string; flag: string }[] = [
  { code: "KR", flag: "🇰🇷" },
  { code: "JP", flag: "🇯🇵" },
  { code: "US", flag: "🇺🇸" },
  { code: "CN", flag: "🇨🇳" },
  { code: "TW", flag: "🇹🇼" },
  { code: "HK", flag: "🇭🇰" },
  { code: "SG", flag: "🇸🇬" },
  { code: "VN", flag: "🇻🇳" },
  { code: "TH", flag: "🇹🇭" },
  { code: "ID", flag: "🇮🇩" },
  { code: "IN", flag: "🇮🇳" },
  { code: "GB", flag: "🇬🇧" },
  { code: "DE", flag: "🇩🇪" },
  { code: "FR", flag: "🇫🇷" },
  { code: "CA", flag: "🇨🇦" },
  { code: "AU", flag: "🇦🇺" },
  { code: "BR", flag: "🇧🇷" },
];

function countryFlag(code: string): string {
  const found = COUNTRY_OPTIONS.find((c) => c.code === code.toUpperCase());
  return found ? found.flag : "🏳️";
}

function CountrySelect({
  value,
  onChange,
  disabled,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50"
      aria-label={t("countryLabel")}
    >
      <option value="">{t("countryAny")}</option>
      {COUNTRY_OPTIONS.map((c) => (
        <option key={c.code} value={c.code}>
          {c.flag} {c.code}
        </option>
      ))}
    </select>
  );
}

function RowCountrySelect({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px]"
      aria-label={t("countryLabel")}
    >
      <option value="">{t("countryAny")}</option>
      {COUNTRY_OPTIONS.map((c) => (
        <option key={c.code} value={c.code}>
          {c.flag} {c.code}
        </option>
      ))}
    </select>
  );
}
