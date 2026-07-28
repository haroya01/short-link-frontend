"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  addDestination,
  deleteDestination,
  getBlockedCountries,
  listDestinations,
  setBlockedCountries,
  updateDestination,
} from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { countryFlag } from "@/lib/utils";
import { CountryCombobox } from "@/components/links/country-combobox";
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
  const [deviceClass, setDeviceClass] = useState("");
  const [os, setOs] = useState("");
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
        deviceClass || undefined,
        os || undefined,
      );
      setUrl("");
      setLabel("");
      setWeight(50);
      setCountry("");
      setDeviceClass("");
      setOs("");
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
  const split = abSplit(items ?? [], clicksByDestId);

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("title")}</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{t("description")}</p>
      </div>

      <form onSubmit={handleAdd} className="grid gap-2 sm:grid-cols-[1fr_100px_120px] sm:items-start">
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
        <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
          <CountryCombobox value={country} onChange={setCountry} disabled={busy} allowAny />
          <DeviceClassSelect value={deviceClass} onChange={setDeviceClass} disabled={busy} t={t} />
          <OsSelect value={os} onChange={setOs} disabled={busy} t={t} />
          <Button
            type="submit"
            size="sm"
            variant="accent"
            disabled={busy || !url.trim()}
            className="ml-auto"
          >
            {busy ? t("adding") : t("add")}
          </Button>
        </div>
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
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("empty")}</p>
        ) : (
          items.map((d) => (
            <DestinationRow
              key={d.id}
              label={d.label ?? `#${d.id}`}
              url={d.url}
              count={clicksByDestId.get(d.id) ?? 0}
              total={totalClicks}
              weight={d.weight}
              share={split.get(d.id)}
              enabled={d.enabled}
              countryCode={d.countryCode}
              deviceClass={d.deviceClass}
              os={d.os}
              onToggle={() => patch(d.id, { enabled: !d.enabled })}
              onWeightChange={(next) => patch(d.id, { weight: next })}
              onCountryChange={(next) => patch(d.id, { countryCode: next })}
              onDeviceClassChange={(next) => patch(d.id, { deviceClass: next })}
              onOsChange={(next) => patch(d.id, { os: next })}
              onDelete={() => handleDelete(d.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

/**
 * "설정 50% · 실제 48%" 를 붙일 수 있는 행들 — 조건(국가·기기·OS)이 걸리지 않은 활성 도착지끼리의
 * 가중치 추첨, 즉 진짜 A/B 인 행만이다.
 *
 * <p>조건이 걸린 도착지는 같은 추첨에 들어가지 않는다(백엔드 {@code CachedLink#pick}: 조건이
 * 맞는 것들 중 <b>가장 구체적인</b> 무리가 이기고, 가중치 추첨은 그 무리 안에서만 돈다). JP 전용
 * 도착지에 "설정 33%" 를 붙이면 설정과 실제가 영원히 어긋나 보여, 배포 버그를 잡으라고 만든
 * 숫자가 매번 거짓 경보를 울린다. 그래서 그런 행에는 아예 안 붙인다.
 *
 * <p>분모도 이 무리 안으로 닫는다 — 설정 비율은 무리 안의 비율이니 실제도 무리 안의 비율이어야
 * 두 수가 같은 질문에 답한다.
 */
function abSplit(
  items: DestinationSummary[],
  clicksByDestId: Map<number, number>,
): Map<number, { configured: number; actual: number }> {
  const pool = items.filter(
    (d) => d.enabled && !d.countryCode && !d.deviceClass && !d.os && d.weight > 0,
  );
  const out = new Map<number, { configured: number; actual: number }>();
  if (pool.length < 2) return out;
  const weightSum = pool.reduce((s, d) => s + d.weight, 0);
  const clickSum = pool.reduce((s, d) => s + (clicksByDestId.get(d.id) ?? 0), 0);
  if (weightSum <= 0 || clickSum <= 0) return out;
  for (const d of pool) {
    out.set(d.id, {
      configured: (d.weight / weightSum) * 100,
      actual: ((clicksByDestId.get(d.id) ?? 0) / clickSum) * 100,
    });
  }
  return out;
}

function DestinationRow({
  label,
  url,
  count,
  total,
  weight,
  share,
  enabled,
  countryCode,
  deviceClass,
  os,
  isControl,
  onToggle,
  onWeightChange,
  onCountryChange,
  onDeviceClassChange,
  onOsChange,
  onDelete,
}: {
  label: string;
  url: string;
  count: number;
  total: number;
  weight?: number;
  /** A/B 추첨에 든 행에만 있는 설정/실제 비율(둘 다 %). */
  share?: { configured: number; actual: number };
  enabled?: boolean;
  countryCode?: string | null;
  deviceClass?: string | null;
  os?: string | null;
  isControl?: boolean;
  onToggle?: () => void;
  onWeightChange?: (n: number) => void;
  onCountryChange?: (next: string | null) => void;
  onDeviceClassChange?: (next: string | null) => void;
  onOsChange?: (next: string | null) => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("stats.destinations");
  // 막대와 옆의 숫자는 같은 질문에 답해야 한다 — A/B 행이면 둘 다 추첨 무리 안의 비율로.
  const pct = share ? share.actual : total === 0 ? 0 : (count / total) * 100;
  return (
    <div
      className={
        "rounded-md border px-3 py-2 text-xs " +
        (enabled === false
          ? "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900")
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-900 dark:text-slate-100">{label}</span>
        {isControl && (
          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
            {t("controlBadge")}
          </span>
        )}
        {weight != null && !share && (
          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">
            w {weight}
          </span>
        )}
        {countryCode && (
          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">
            {countryFlag(countryCode)} {countryCode}
          </span>
        )}
        {deviceClass && (
          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-slate-300">
            {t(`device.${deviceClass}`)}
          </span>
        )}
        {os && (
          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-slate-300">
            {t(`os.${os}`)}
          </span>
        )}
        {enabled === false && (
          <span className="rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-slate-300">
            {t("disabled")}
          </span>
        )}
        <ShareReadout count={count} pct={pct} share={share} />
      </div>
      {url && (
        <code
          className="mt-1 block break-all font-mono text-[11px] text-slate-500 dark:text-slate-400"
          title={url}
        >
          {url}
        </code>
      )}
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
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
            <CountryCombobox
              value={countryCode ?? ""}
              onChange={(v) => onCountryChange(v || null)}
              size="sm"
              allowAny
            />
          )}
          {onDeviceClassChange && (
            <RowSelect
              value={deviceClass ?? ""}
              onChange={(v) => onDeviceClassChange(v || null)}
              ariaLabel={t("deviceLabel")}
              anyLabel={t("deviceAny")}
              options={DEVICE_CLASS_OPTIONS.map((id) => ({ value: id, label: t(`device.${id}`) }))}
            />
          )}
          {onOsChange && (
            <RowSelect
              value={os ?? ""}
              onChange={(v) => onOsChange(v || null)}
              ariaLabel={t("osLabel")}
              anyLabel={t("osAny")}
              options={OS_OPTIONS.map((id) => ({ value: id, label: t(`os.${id}`) }))}
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
              className="text-red-600 dark:text-red-400 hover:bg-red-50"
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

/**
 * 행 오른쪽 수치. A/B 추첨에 든 행에서는 <b>설정</b>과 <b>실제</b>를 나란히 세운다 — 이 둘이 크게
 * 어긋나면 라우팅이 설정대로 안 돌고 있다는 뜻이고, 지금까지는 실제만 있어서 그걸 알아챌
 * 방법이 없었다. 설정은 muted, 실제가 본문 — 눈이 먼저 가야 하는 건 실제 쪽이다.
 */
function ShareReadout({
  count,
  pct,
  share,
}: {
  count: number;
  pct: number;
  share?: { configured: number; actual: number };
}) {
  const t = useTranslations("stats.destinations");
  return (
    <span className="ml-auto flex items-baseline gap-1.5 font-mono tabular-nums text-slate-700 dark:text-slate-300">
      <span>{count}</span>
      <span className="text-slate-300 dark:text-slate-600">·</span>
      {share ? (
        <>
          <span className="text-slate-400 dark:text-slate-500">
            {t("configuredShare", { pct: share.configured.toFixed(0) })}
          </span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {t("actualShare", { pct: share.actual.toFixed(0) })}
          </span>
        </>
      ) : (
        <span>{pct.toFixed(1)}%</span>
      )}
    </span>
  );
}

// Mirrors the backend @Pattern on destination requests (mobile|tablet|desktop, and the OS set).
const DEVICE_CLASS_OPTIONS = ["mobile", "tablet", "desktop"] as const;
const OS_OPTIONS = ["ios", "android", "windows", "macos", "linux"] as const;

/**
 * Geo-block editor: countries whose visitors are blocked from this link. Loads the current set,
 * shows it as removable chips, and adds via the same {@link CountrySelect} as destinations. Each
 * change persists immediately (PUT /blocked-countries) and adopts the backend-normalized value.
 */
export function LinkBlockedCountriesSection({ shortCode }: { shortCode: string }) {
  const t = useTranslations("stats.destinations");
  const { toast } = useToast();
  const toMessage = useApiErrorMessage();
  const [codes, setCodes] = useState<string[]>([]);
  const [pick, setPick] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getBlockedCountries(shortCode)
      .then((csv) => active && setCodes(csv ? csv.split(",").filter(Boolean) : []))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [shortCode]);

  async function persist(next: string[]) {
    setBusy(true);
    const prev = codes;
    setCodes(next); // optimistic
    try {
      const stored = await setBlockedCountries(shortCode, next.join(","));
      setCodes(stored ? stored.split(",").filter(Boolean) : []);
    } catch (e) {
      setCodes(prev);
      toast(toMessage(e, t("blockedFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  function add(code: string) {
    const c = code.toUpperCase();
    if (!c || codes.includes(c)) return;
    void persist([...codes, c]);
    setPick("");
  }

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold tracking-headline text-slate-900 dark:text-slate-100">
          {t("blockedTitle")}
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t("blockedDesc")}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <CountryCombobox value={pick} onChange={add} disabled={busy} />
        <span className="text-[12px] text-slate-500 dark:text-slate-400">{t("blockedAddHint")}</span>
      </div>

      <div className="mt-3">
        {loading ? (
          <p className="text-[12px] text-slate-500 dark:text-slate-400">{t("blockedLoading")}</p>
        ) : codes.length === 0 ? (
          <p className="text-[12px] text-slate-500 dark:text-slate-400">{t("blockedEmpty")}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {codes.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 text-[12px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {countryFlag(c)} {c}
                <button
                  type="button"
                  onClick={() => persist(codes.filter((x) => x !== c))}
                  disabled={busy}
                  aria-label={t("blockedRemove")}
                  className="ml-0.5 text-slate-400 dark:text-slate-500 hover:text-red-600 disabled:opacity-50"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function DeviceClassSelect({
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
      className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 disabled:opacity-50"
      aria-label={t("deviceLabel")}
    >
      <option value="">{t("deviceAny")}</option>
      {DEVICE_CLASS_OPTIONS.map((id) => (
        <option key={id} value={id}>
          {t(`device.${id}`)}
        </option>
      ))}
    </select>
  );
}

function OsSelect({
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
      className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 disabled:opacity-50"
      aria-label={t("osLabel")}
    >
      <option value="">{t("osAny")}</option>
      {OS_OPTIONS.map((id) => (
        <option key={id} value={id}>
          {t(`os.${id}`)}
        </option>
      ))}
    </select>
  );
}

function RowSelect({
  value,
  onChange,
  ariaLabel,
  anyLabel,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  anyLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-[11px]"
      aria-label={ariaLabel}
    >
      <option value="">{anyLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
