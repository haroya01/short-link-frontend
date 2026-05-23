"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getAdminTopLinksByClicks,
  getAdminTopUsersByClicks,
  getAdminTopUsersByLinks,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import type { AdminTopLinkStat, AdminTopUserStat } from "@/types";

const PAGE_SIZE = 10;

type Variant = "links" | "clicks";

export function AdminTopUsersTable({
  variant,
  initialItems,
  initialTotal,
}: {
  variant: Variant;
  initialItems: AdminTopUserStat[];
  initialTotal: number;
}) {
  const t = useTranslations("admin");
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  async function goTo(next: number) {
    if (loading || next === page) return;
    setLoading(true);
    try {
      const fetcher = variant === "links" ? getAdminTopUsersByLinks : getAdminTopUsersByClicks;
      const data = await fetcher(next, PAGE_SIZE);
      setItems(data.items);
      setTotal(data.total);
      setPage(next);
    } catch {
      // Pagination failure is noisy if we toast on every click — leave the table on the previous
      // page; the user can retry by clicking a page button again. Network-level errors will
      // surface via the global error boundary if the API is fully down.
    } finally {
      setLoading(false);
    }
  }

  const unit = variant === "links" ? t("table.links") : t("table.clicks");
  return (
    <TopTableShell
      total={total}
      page={page}
      onPage={goTo}
      loading={loading}
      empty={items.length === 0}
      headerRow={
        <TR>
          <TH>{t("table.user")}</TH>
          <TH className="text-right">{unit}</TH>
        </TR>
      }
      bodyRows={items.map((r) => (
        <TR key={r.userId}>
          <TD className="text-sm">{r.email}</TD>
          <TD className="text-right tabular-nums font-medium">{formatNumber(r.count)}</TD>
        </TR>
      ))}
    />
  );
}

export function AdminTopLinksTable({
  initialItems,
  initialTotal,
}: {
  initialItems: AdminTopLinkStat[];
  initialTotal: number;
}) {
  const t = useTranslations("admin");
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  async function goTo(next: number) {
    if (loading || next === page) return;
    setLoading(true);
    try {
      const data = await getAdminTopLinksByClicks(next, PAGE_SIZE);
      setItems(data.items);
      setTotal(data.total);
      setPage(next);
    } catch {
      // see AdminTopUsersTable.goTo
    } finally {
      setLoading(false);
    }
  }

  return (
    <TopTableShell
      total={total}
      page={page}
      onPage={goTo}
      loading={loading}
      empty={items.length === 0}
      headerRow={
        <TR>
          <TH>{t("table.shortCode")}</TH>
          <TH>{t("table.owner")}</TH>
          <TH className="text-right">{t("table.clicks")}</TH>
        </TR>
      }
      bodyRows={items.map((l) => (
        <TR key={l.shortCode}>
          <TD>
            <Link
              href={`/stats/${l.shortCode}`}
              className="font-mono text-sm font-medium text-slate-900 hover:underline"
            >
              /{l.shortCode}
            </Link>
          </TD>
          <TD className="text-xs text-slate-500">{l.ownerEmail ?? t("table.anonymous")}</TD>
          <TD className="text-right tabular-nums font-medium">{formatNumber(l.clickCount)}</TD>
        </TR>
      ))}
    />
  );
}

function TopTableShell({
  total,
  page,
  onPage,
  loading,
  empty,
  headerRow,
  bodyRows,
}: {
  total: number;
  page: number;
  onPage: (next: number) => void;
  loading: boolean;
  empty: boolean;
  headerRow: React.ReactNode;
  bodyRows: React.ReactNode;
}) {
  const t = useTranslations("admin");
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (empty && page === 0) {
    return <p className="py-8 text-center text-xs text-slate-500">{t("noData")}</p>;
  }

  return (
    <div className="space-y-3">
      <Table>
        <THead>{headerRow}</THead>
        <TBody>{bodyRows}</TBody>
      </Table>
      {totalPages > 1 && (
        <PageControls
          page={page}
          totalPages={totalPages}
          loading={loading}
          onPage={onPage}
        />
      )}
    </div>
  );
}

function PageControls({
  page,
  totalPages,
  loading,
  onPage,
}: {
  page: number;
  totalPages: number;
  loading: boolean;
  onPage: (next: number) => void;
}) {
  const t = useTranslations("admin.pagination");
  // Truncate to <= 7 buttons: first, ..., a few around current, ..., last. Keeps the control row
  // single-line even when totalPages reaches the size cap (50 pages worth of data).
  const numbers = pageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-500">
        {t("page", { page: page + 1, total: totalPages })}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page - 1)}
          disabled={loading || page === 0}
          aria-label={t("prev")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {numbers.map((n, i) =>
          n === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-slate-400">
              …
            </span>
          ) : (
            <Button
              key={n}
              variant={n === page ? "accent" : "outline"}
              size="sm"
              onClick={() => onPage(n)}
              disabled={loading}
              className="min-w-[2rem]"
            >
              {n + 1}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page + 1)}
          disabled={loading || page >= totalPages - 1}
          aria-label={t("next")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function pageNumbers(current: number, totalPages: number): Array<number | "…"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const out: Array<number | "…"> = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(totalPages - 2, current + 1);
  if (start > 1) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < totalPages - 2) out.push("…");
  out.push(totalPages - 1);
  return out;
}
