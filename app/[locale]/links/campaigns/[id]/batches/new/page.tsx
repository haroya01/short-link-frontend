"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardPaste, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { createCampaignBatchesBulk, getCampaign } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import type { CampaignDetail } from "@/types";

type RowDraft = {
  id: string;
  name: string;
  distributor: string;
  area: string;
  quantity: string;
  destinationUrl: string;
  memo: string;
};

type RowErrorKey =
  | "nameRequired"
  | "quantityRequired"
  | "quantityPositive"
  | "destinationRequired"
  | "destinationUrl";
type RowErrors = Partial<Record<"name" | "quantity" | "destinationUrl", RowErrorKey>>;

const KOREAN_BATCH_NAME_WITH_SPACE = String.fromCharCode(0xbb36, 0xc74c, 0x0020, 0xc774, 0xb984);
const KOREAN_BATCH_NAME_COMPACT = String.fromCharCode(0xbb36, 0xc74c, 0xc774, 0xb984);

function blankRow(): RowDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    distributor: "",
    area: "",
    quantity: "",
    destinationUrl: "",
    memo: "",
  };
}

/**
 * QR 캠페인의 배포 묶음 추가. Form-first — 빈 row 1개에서 시작. 추가 row 는 [+ 행 추가],
 * 스프레드시트 사용자는 [붙여넣기] 토글로 textarea 모드. paste 결과는 같은 row form 으로
 * 변환돼 validation UI 가 한 곳. 한 행이라도 invalid 면 생성 거부 — 부분 성공 사고 방지.
 */
export default function NewBatchPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = Number(id);
  const router = useRouter();
  const { authenticated, ready } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("campaignApp.batchesNew");

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RowDraft[]>(() => [blankRow()]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated || !Number.isFinite(campaignId)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getCampaign(campaignId)
      .then((c) => {
        if (!cancelled) setCampaign(c);
      })
      .catch((err) => {
        if (!cancelled) toast(err instanceof Error ? err.message : t("loadFailed"), "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, campaignId]);

  const hasDefault = !!campaign?.defaultDestinationUrl;

  const rowErrors = useMemo<RowErrors[]>(
    () => rows.map((row) => validateRow(row, hasDefault)),
    [rows, hasDefault],
  );

  const totalQuantity = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const n = parseInt(r.quantity, 10);
        return sum + (Number.isFinite(n) && n > 0 ? n : 0);
      }, 0),
    [rows],
  );

  const invalidCount = rowErrors.filter((e) => Object.keys(e).length > 0).length;
  const canSubmit = rows.length > 0 && invalidCount === 0 && !submitting;

  function updateRow(idx: number, patch: Partial<RowDraft>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, blankRow()]);
  }

  function removeRow(idx: number) {
    setRows((prev) => (prev.length === 1 ? [blankRow()] : prev.filter((_, i) => i !== idx)));
  }

  function applyPaste() {
    const parsed = parsePastedRows(pasteText);
    if (parsed.length === 0) {
      toast(t("pasteEmpty"), "error");
      return;
    }
    setRows((prev) => {
      const trimmedFirst = prev.length === 1 && isRowEmpty(prev[0]) ? [] : prev;
      return [...trimmedFirst, ...parsed];
    });
    setPasteText("");
    setPasteOpen(false);
    toast(t("pasteAdded", { count: parsed.length }), "success");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createCampaignBatchesBulk(campaignId, {
        batches: rows.map((r) => ({
          name: r.name.trim(),
          distributorName: r.distributor.trim() || undefined,
          areaLabel: r.area.trim() || undefined,
          quantity: parseInt(r.quantity, 10),
          destinationUrl: r.destinationUrl.trim() || undefined,
          memo: r.memo.trim() || undefined,
        })),
      });
      toast(t("created", { count: rows.length }), "success");
      router.push(`/campaigns/${campaignId}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : t("createFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (ready && !authenticated) {
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 dark:text-slate-100 sm:text-[30px]">
          {t("loginRequired")}
        </h1>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <Link
        href={`/campaigns/${campaignId}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t("backToCampaign")}
      </Link>

      <div>
        <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 dark:text-slate-100 sm:text-[30px]">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {loading ? (
            <Skeleton className="inline-block h-4 w-40" />
          ) : campaign ? (
            <>
              {t.rich("introCampaign", {
                name: () => <span className="font-medium text-slate-700 dark:text-slate-300">{campaign.name}</span>,
              })}
            </>
          ) : null}
        </p>
      </div>

      {!loading && (
        <DestinationHint defaultDestinationUrl={campaign?.defaultDestinationUrl ?? null} />
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <RowsTable
          rows={rows}
          rowErrors={rowErrors}
          hasDefault={hasDefault}
          onUpdate={updateRow}
          onRemove={removeRow}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={addRow}>
            <Plus className="h-4 w-4" aria-hidden /> {t("addRow")}
          </Button>
          <Button type="button" variant="outline" onClick={() => setPasteOpen((v) => !v)}>
            <ClipboardPaste className="h-4 w-4" aria-hidden /> {t("pasteToggle")}
          </Button>
        </div>

        {pasteOpen && (
          <PastePanel
            text={pasteText}
            onChange={setPasteText}
            onApply={applyPaste}
            onClose={() => {
              setPasteOpen(false);
              setPasteText("");
            }}
          />
        )}

        <SubmitBar
          rowCount={rows.length}
          invalidCount={invalidCount}
          totalQuantity={totalQuantity}
          canSubmit={canSubmit}
          submitting={submitting}
          onCancel={() => router.push(`/campaigns/${campaignId}`)}
        />
      </form>
    </div>
  );
}

function DestinationHint({
  defaultDestinationUrl,
}: {
  defaultDestinationUrl: string | null;
}) {
  const t = useTranslations("campaignApp.batchesNew");
  if (defaultDestinationUrl) {
    return (
      <div className="rounded-2xl border border-accent-200 bg-accent-50/40 dark:bg-accent-500/10 px-4 py-3">
        <p className="text-[12px] leading-snug text-slate-700 dark:text-slate-300">
          {t.rich("defaultUrlActive", {
            strong: (chunks) => (
              <span className="font-medium text-accent-700 dark:text-accent-400">{chunks}</span>
            ),
            code: () => (
              <code className="rounded bg-white dark:bg-slate-900 px-1 py-0.5 text-[11px]">
                {defaultDestinationUrl}
              </code>
            ),
          })}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 px-4 py-3">
      <p className="text-[12px] leading-snug text-slate-700 dark:text-slate-300">
        {t.rich("defaultUrlMissing", {
          strong: (chunks) => (
            <span className="font-medium text-amber-800 dark:text-amber-300">{chunks}</span>
          ),
        })}
      </p>
    </div>
  );
}

function RowsTable({
  rows,
  rowErrors,
  hasDefault,
  onUpdate,
  onRemove,
}: {
  rows: RowDraft[];
  rowErrors: RowErrors[];
  hasDefault: boolean;
  onUpdate: (idx: number, patch: Partial<RowDraft>) => void;
  onRemove: (idx: number) => void;
}) {
  const t = useTranslations("campaignApp.batchesNew");
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* Desktop header */}
      <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.7fr_1.6fr_0.5fr] gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 lg:grid">
        <span>
          {t("fields.name")} <span className="text-accent-700 dark:text-accent-400">*</span>
        </span>
        <span>{t("fields.distributor")}</span>
        <span>{t("fields.area")}</span>
        <span>
          {t("fields.quantity")} <span className="text-accent-700 dark:text-accent-400">*</span>
        </span>
        <span>{t("fields.destinationUrl")}</span>
        <span></span>
      </div>

      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {rows.map((row, idx) => (
          <RowItem
            key={row.id}
            index={idx}
            row={row}
            errors={rowErrors[idx]}
            hasDefault={hasDefault}
            canRemove={rows.length > 1}
            onUpdate={(patch) => onUpdate(idx, patch)}
            onRemove={() => onRemove(idx)}
          />
        ))}
      </ul>
    </div>
  );
}

function RowItem({
  index,
  row,
  errors,
  hasDefault,
  canRemove,
  onUpdate,
  onRemove,
}: {
  index: number;
  row: RowDraft;
  errors: RowErrors;
  hasDefault: boolean;
  canRemove: boolean;
  onUpdate: (patch: Partial<RowDraft>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("campaignApp.batchesNew");
  return (
    <li className="px-4 py-3 lg:py-2.5">
      {/* Mobile: stacked. Desktop: 6-col grid. */}
      <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[1.4fr_1fr_1fr_0.7fr_1.6fr_0.5fr] lg:items-start lg:gap-2">
        <Cell label={t("fields.name")} required error={errors.name ? t(`errors.${errors.name}`) : undefined}>
          <Input
            value={row.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder={t("placeholders.name")}
            className={errors.name ? "border-rose-400 focus-visible:ring-rose-400" : undefined}
          />
        </Cell>
        <Cell label={t("fields.distributor")} hint={t("compareHint")}>
          <Input
            value={row.distributor}
            onChange={(e) => onUpdate({ distributor: e.target.value })}
            placeholder={t("placeholders.distributor")}
          />
        </Cell>
        <Cell label={t("fields.area")} hint={t("compareHint")}>
          <Input
            value={row.area}
            onChange={(e) => onUpdate({ area: e.target.value })}
            placeholder="Shinjuku East"
          />
        </Cell>
        <Cell label={t("fields.quantity")} required error={errors.quantity ? t(`errors.${errors.quantity}`) : undefined}>
          <Input
            type="number"
            min="1"
            inputMode="numeric"
            value={row.quantity}
            onChange={(e) => onUpdate({ quantity: e.target.value })}
            placeholder="500"
            className={errors.quantity ? "border-rose-400 focus-visible:ring-rose-400" : undefined}
          />
        </Cell>
        <Cell
          label={t("fields.destinationUrl")}
          hint={hasDefault ? t("hints.defaultOptional") : t("hints.defaultRequired")}
          error={errors.destinationUrl ? t(`errors.${errors.destinationUrl}`) : undefined}
        >
          <Input
            type="url"
            value={row.destinationUrl}
            onChange={(e) => onUpdate({ destinationUrl: e.target.value })}
            placeholder={hasDefault ? t("placeholders.defaultValue") : "https://example.com/landing"}
            className={errors.destinationUrl ? "border-rose-400 focus-visible:ring-rose-400" : undefined}
          />
        </Cell>
        <div className="flex items-end justify-end lg:items-start lg:pt-1">
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label={t("removeRow", { index: index + 1 })}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}

function Cell({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("campaignApp.batchesNew");
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 lg:hidden">
        {label}
        {required && <span className="ml-1 text-accent-700 dark:text-accent-400">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[11px] leading-snug text-rose-600">{error}</p>
      ) : (
        hint && <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400 lg:hidden">{hint}</p>
      )}
    </div>
  );
}

function PastePanel({
  text,
  onChange,
  onApply,
  onClose,
}: {
  text: string;
  onChange: (v: string) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("campaignApp.batchesNew");
  const preview = useMemo(() => parsePastedRows(text), [text]);
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("pasteTitle")}</h3>
          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
            {t.rich("pasteColumns", {
              code: (chunks) => (
                <code className="rounded bg-slate-100 dark:bg-slate-800 px-1">{chunks}</code>
              ),
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <Textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="mt-3 font-mono text-[12px]"
        placeholder={t("pastePlaceholder")}
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[12px] text-slate-500 dark:text-slate-400">
          {text.trim() === "" ? t("pasteZeroRows") : t("pastePreviewRows", { count: preview.length })}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="accent"
            onClick={onApply}
            disabled={preview.length === 0}
          >
            {t("pasteApply", { count: preview.length })}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SubmitBar({
  rowCount,
  invalidCount,
  totalQuantity,
  canSubmit,
  submitting,
  onCancel,
}: {
  rowCount: number;
  invalidCount: number;
  totalQuantity: number;
  canSubmit: boolean;
  submitting: boolean;
  onCancel: () => void;
}) {
  const t = useTranslations("campaignApp.batchesNew");

  return (
    <div className="sticky bottom-3 z-10 mt-4 flex flex-col items-stretch gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
      <div className="text-[12px] text-slate-500 dark:text-slate-400">
        {invalidCount > 0 ? (
          <span className="text-rose-600">
            {t("invalidRows", { count: invalidCount })}
          </span>
        ) : (
          <>
            {t.rich("summary", {
              rowCount,
              totalQuantity: totalQuantity.toLocaleString(),
              strong: (chunks: ReactNode) => (
                <span className="font-medium text-slate-900 dark:text-slate-100">{chunks}</span>
              ),
            })}
          </>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" variant="accent" disabled={!canSubmit}>
          {submitting ? t("creating") : t("submit", { count: rowCount })}
        </Button>
      </div>
    </div>
  );
}

function isRowEmpty(r: RowDraft): boolean {
  return (
    !r.name.trim() &&
    !r.distributor.trim() &&
    !r.area.trim() &&
    !r.quantity.trim() &&
    !r.destinationUrl.trim() &&
    !r.memo.trim()
  );
}

function validateRow(r: RowDraft, hasDefault: boolean): RowErrors {
  const errors: RowErrors = {};
  if (!r.name.trim()) errors.name = "nameRequired";
  const q = parseInt(r.quantity, 10);
  if (!r.quantity.trim()) errors.quantity = "quantityRequired";
  else if (!Number.isFinite(q) || q <= 0) errors.quantity = "quantityPositive";
  if (!hasDefault && !r.destinationUrl.trim()) {
    errors.destinationUrl = "destinationRequired";
  } else if (r.destinationUrl.trim() && !isValidHttpUrl(r.destinationUrl.trim())) {
    errors.destinationUrl = "destinationUrl";
  }
  return errors;
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Tab 또는 콤마로 구분된 N 줄을 RowDraft 로 변환. 빈 줄 skip. 헤더 라인 (첫 줄에 "묶음 이름" /
 * "batch_name" 같은 단어) 도 skip. 컬럼은 ≥ 4 (name / distributor / area / quantity), 추가
 * 2 컬럼 (destinationUrl / memo) optional.
 */
function parsePastedRows(text: string): RowDraft[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  return lines
    .filter((l) => !looksLikeHeader(l))
    .map((line) => {
      const cells = line.includes("\t") ? line.split("\t") : line.split(",");
      const [name = "", distributor = "", area = "", quantity = "", destinationUrl = "", memo = ""] =
        cells.map((c) => c.trim());
      return {
        id: crypto.randomUUID(),
        name,
        distributor,
        area,
        quantity,
        destinationUrl,
        memo,
      };
    });
}

function looksLikeHeader(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes("batch_name") ||
    lower.includes(KOREAN_BATCH_NAME_WITH_SPACE) ||
    lower.includes(KOREAN_BATCH_NAME_COMPACT) ||
    (lower.includes("name") && lower.includes("quantity"))
  );
}
