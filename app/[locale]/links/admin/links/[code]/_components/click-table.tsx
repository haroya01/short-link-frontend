"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/common/error-state";
import { Section } from "@/components/common/section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { usePresence } from "@/hooks/use-presence";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";
import {
  clickDevice,
  clickPlace,
  clickSource,
  inClickView,
  loadUntilVisible,
  markClicks,
  selectionState,
  sendInChunks,
  toggleAll,
  toggleRange,
  type ClickView,
} from "@/lib/admin-clicks";
import { getAdminLinkClicks, setAdminLinkClicksExcluded, type AdminLinkClick } from "@/lib/api";
import { regionCodeOf, regionMessageKey } from "@/lib/regions";
import { useStatsLabels } from "@/lib/stats-labels";
import { cn, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 100;
const QUIET_PAGES = 5;
// Must match the duration of animate-fade-out (tailwind.config).
const LEAVE_MS = 160;
const VIEWS: ClickView[] = ["human", "excluded"];

type Props = {
  code: string;
  timezone: string;
  onChanged: () => void;
};

export function ClickTable({ code, timezone, onChanged }: Props) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tStats = useTranslations("stats");
  const labels = useStatsLabels();
  const { toast } = useToast();

  const [rows, setRows] = useState<AdminLinkClick[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [view, setView] = useState<ClickView>("human");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const anchor = useRef<number | null>(null);
  const loadSeq = useRef(0);

  const fetchPage = useCallback(
    (seq: number) => (cursorAt: string | null) => {
      if (seq !== loadSeq.current) return Promise.reject(new Error("superseded"));
      return getAdminLinkClicks(code, cursorAt, PAGE_SIZE);
    },
    [code],
  );

  const load = useCallback(
    (forView: ClickView) => {
      const seq = ++loadSeq.current;
      setPhase("loading");
      setSelected(new Set());
      anchor.current = null;
      loadUntilVisible(fetchPage(seq), null, forView, QUIET_PAGES)
        .then((page) => {
          if (seq !== loadSeq.current) return;
          setRows(page.items);
          setCursor(page.nextCursor);
          setPhase("ready");
        })
        .catch(() => {
          if (seq === loadSeq.current) setPhase("error");
        });
      return () => {
        if (seq === loadSeq.current) loadSeq.current++;
      };
    },
    [fetchPage],
  );

  useEffect(() => {
    setView("human");
    return load("human");
  }, [load]);

  const visible = useMemo(() => rows.filter((row) => inClickView(row, view)), [rows, view]);
  const ids = useMemo(() => visible.map((row) => row.id), [visible]);
  const picked = useMemo(() => ids.filter((id) => selected.has(id)), [ids, selected]);
  const headState = selectionState(ids, selected);

  const bar = usePresence(picked.length > 0 && phase === "ready", LEAVE_MS);
  const barCount = useRef(0);
  if (picked.length > 0) barCount.current = picked.length;

  const display = useMemo(
    () =>
      visible.map(({ id, click }) => {
        const regionCode = regionCodeOf(click.region, click.regionCode);
        const region = regionCode ? tStats(`regionNames.${regionMessageKey(regionCode)}`) : click.region;
        return {
          id,
          time: formatDateTime(click.clickedAt, timezone),
          place: clickPlace(click, labels, region),
          device: clickDevice(click, labels),
          source: clickSource(click, labels),
          ip: click.ipMasked ?? "—",
        };
      }),
    [visible, timezone, labels, tStats],
  );

  function clearSelection() {
    setSelected(new Set());
    anchor.current = null;
  }

  function pickView(next: ClickView) {
    if (next === view) return;
    setView(next);
    clearSelection();
  }

  function toggleRow(id: number, checked: boolean, shift: boolean) {
    setSelected((prev) => toggleRange(ids, prev, shift ? anchor.current : null, id, checked));
    anchor.current = id;
  }

  async function loadMore() {
    if (loadingMore || !cursor) return;
    const seq = loadSeq.current;
    setLoadingMore(true);
    try {
      const page = await loadUntilVisible(fetchPage(seq), cursor, view, QUIET_PAGES);
      if (seq !== loadSeq.current) return;
      setRows((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      if (seq === loadSeq.current) toast(t("clicks.loadFailed"), "error");
    } finally {
      setLoadingMore(false);
    }
  }

  function settle(changedIds: ReadonlySet<number>, excluded: boolean) {
    const commit = () => {
      setRows((prev) => markClicks(prev, changedIds, excluded));
      setLeaving(new Set());
    };
    if (prefersReducedMotion()) {
      commit();
      return;
    }
    setLeaving(new Set(changedIds));
    window.setTimeout(commit, LEAVE_MS);
  }

  async function apply() {
    if (busy || picked.length === 0) return;
    const excluding = view === "human";
    const sent = picked;
    setBusy(true);
    const { changed, error } = await sendInChunks(sent, (chunk) =>
      setAdminLinkClicksExcluded(code, chunk, excluding),
    );
    setBusy(false);
    clearSelection();
    if (error) {
      toast(t(excluding ? "clicks.excludeFailed" : "clicks.restoreFailed", { count: changed }), "error");
      load(view);
    } else {
      toast(t(excluding ? "clicks.excluded" : "clicks.restored", { count: changed }), "success");
      settle(new Set(sent), excluding);
    }
    onChanged();
  }

  return (
    <Section title={t("clicks.title")} description={timezone} footnote={t("clicks.retention")}>
      <div className="sticky top-14 z-10 -mx-5 -mt-5 flex min-h-[3.25rem] flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 bg-white px-5 py-2 dark:border-slate-800 dark:bg-slate-900">
        <div
          role="group"
          aria-label={t("clicks.views")}
          className={cn("gap-1.5", bar.mounted ? "hidden sm:flex" : "flex")}
        >
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              disabled={busy}
              onClick={() => pickView(v)}
              className={cn(
                "focus-ring rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
                view === v
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
              )}
            >
              {t(`clicks.view.${v}`)}
            </button>
          ))}
        </div>
        {bar.mounted && (
          <div
            data-testid="click-selection-bar"
            className={cn(
              "flex w-full items-center gap-2 text-xs sm:ml-auto sm:w-auto",
              bar.closing ? "pointer-events-none animate-fade-out" : "animate-fade-in",
            )}
          >
            <span className="mr-auto tabular-nums text-slate-700 dark:text-slate-300 sm:mr-0">
              {t("clicks.selected", { count: barCount.current })}
            </span>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={clearSelection}>
              {t("clicks.clear")}
            </Button>
            <Button type="button" size="sm" variant="default" disabled={busy} onClick={apply}>
              {busy ? tc("processing") : t(view === "human" ? "clicks.exclude" : "clicks.restore")}
            </Button>
          </div>
        )}
      </div>

      <div className="pt-3">
        {phase === "error" ? (
          <ErrorState message={t("clicks.loadFailed")} onRetry={() => load(view)} />
        ) : phase === "loading" ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        ) : display.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {cursor
              ? t("clicks.noneSoFar", { count: rows.length })
              : t(view === "human" ? "clicks.empty" : "clicks.emptyExcluded")}
          </p>
        ) : (
          <>
            <div className="sm:hidden">
              <SelectAll
                state={headState}
                label={t("clicks.selectAll")}
                disabled={busy}
                onToggle={() => setSelected(toggleAll(ids, selected))}
              >
                {t("clicks.selectAll")}
              </SelectAll>
              <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {display.map((row) => (
                  <li
                    key={row.id}
                    className={cn(
                      "-mx-2 flex items-start gap-3 rounded-lg px-2 text-xs",
                      selected.has(row.id) && "bg-slate-50 dark:bg-slate-800/40",
                      leaving.has(row.id) && "animate-fade-out",
                    )}
                  >
                    <SelectRow
                      tall
                      label={t("clicks.selectRow", { time: row.time })}
                      checked={selected.has(row.id)}
                      disabled={busy}
                      onToggle={(checked, shift) => toggleRow(row.id, checked, shift)}
                    />
                    <div className="min-w-0 flex-1 py-2.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="whitespace-nowrap font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {row.time}
                        </span>
                        <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">{row.source}</span>
                      </div>
                      <div className="mt-0.5 text-slate-700 dark:text-slate-200">{row.place}</div>
                      <div className="mt-0.5 flex items-baseline justify-between gap-3">
                        <span className="min-w-0 text-slate-700 dark:text-slate-200">{row.device}</span>
                        <span className="whitespace-nowrap font-mono text-slate-500 dark:text-slate-400">{row.ip}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden sm:block">
              <Table>
                <THead>
                  <TR>
                    <TH className="w-9 pr-0">
                      <SelectAll
                        state={headState}
                        label={t("clicks.selectAll")}
                        disabled={busy}
                        onToggle={() => setSelected(toggleAll(ids, selected))}
                      />
                    </TH>
                    <TH>{t("clicks.col.time")}</TH>
                    <TH>{t("clicks.col.place")}</TH>
                    <TH>{t("clicks.col.device")}</TH>
                    <TH>{t("clicks.col.source")}</TH>
                    <TH>{t("clicks.col.ip")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {display.map((row) => (
                    <TR
                      key={row.id}
                      className={cn(
                        selected.has(row.id) && "bg-slate-50 dark:bg-slate-800/40",
                        leaving.has(row.id) && "animate-fade-out",
                      )}
                    >
                      <TD className="w-9 py-0 pr-0">
                        <SelectRow
                          label={t("clicks.selectRow", { time: row.time })}
                          checked={selected.has(row.id)}
                          disabled={busy}
                          onToggle={(checked, shift) => toggleRow(row.id, checked, shift)}
                        />
                      </TD>
                      <TD className="whitespace-nowrap py-2 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        {row.time}
                      </TD>
                      <TD className="py-2 text-xs">{row.place}</TD>
                      <TD className="py-2 text-xs">{row.device}</TD>
                      <TD className="py-2 text-xs">{row.source}</TD>
                      <TD className="whitespace-nowrap py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {row.ip}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
        {phase === "ready" && cursor && (
          <div className="mt-3">
            <Button type="button" size="sm" variant="ghost" disabled={loadingMore} onClick={loadMore}>
              {loadingMore ? tc("loading") : t("clicks.loadMore")}
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
}

function SelectAll({
  state,
  label,
  disabled,
  onToggle,
  children,
}: {
  state: "none" | "some" | "all";
  label: string;
  disabled: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer select-none items-center gap-3 text-xs text-slate-500 dark:text-slate-400",
        children ? "h-11" : "h-9 w-5 justify-center",
      )}
    >
      <input
        type="checkbox"
        aria-label={label}
        checked={state === "all"}
        disabled={disabled}
        ref={(el) => {
          if (el) el.indeterminate = state === "some";
        }}
        onChange={onToggle}
        className="h-3.5 w-3.5 cursor-pointer"
      />
      {children}
    </label>
  );
}

function SelectRow({
  label,
  checked,
  disabled,
  tall = false,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  tall?: boolean;
  onToggle: (checked: boolean, shift: boolean) => void;
}) {
  return (
    <label className={cn("grid w-5 shrink-0 cursor-pointer select-none place-items-center", tall ? "h-11" : "h-9")}>
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onToggle(e.target.checked, (e.nativeEvent as MouseEvent).shiftKey === true)}
        className="h-3.5 w-3.5 cursor-pointer"
      />
    </label>
  );
}
