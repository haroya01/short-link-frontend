"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, BarChart3, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "./ui/button";
import { Table, TBody, TD, TH, THead, TR } from "./ui/table";
import { CopyButton } from "./copy-button";
import { ConfirmDialog } from "./ui/dialog";
import { EditLinkDialog } from "./edit-link-dialog";
import { Favicon } from "./favicon";
import { Sparkline } from "./sparkline";
import { useToast } from "./ui/toast";
import { deleteLink } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { cn, formatDate, formatNumber, truncateMiddle } from "@/lib/utils";
import type { MyLink } from "@/types";

type SortKey = "createdAt" | "clickCount";
type SortDir = "asc" | "desc";

type Props = {
  items: MyLink[];
  onChanged: () => void;
  onTagClick?: (tag: string) => void;
};

export function LinksTable({ items, onChanged, onTagClick }: Props) {
  const t = useTranslations("dashboard");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [confirmCode, setConfirmCode] = useState<string | null>(null);
  const [editing, setEditing] = useState<MyLink | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        if (sortKey === "createdAt") {
          return (+new Date(a.createdAt) - +new Date(b.createdAt)) * dir;
        }
        return (a.clickCount - b.clickCount) * dir;
      }),
    [items, sortKey, sortDir],
  );

  const allOnPage = sorted.map((s) => s.shortCode);
  const allSelected = allOnPage.length > 0 && allOnPage.every((c) => selected.has(c));
  const someSelected = !allSelected && allOnPage.some((c) => selected.has(c));

  function toggleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  }

  function toggleOne(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        for (const c of allOnPage) next.delete(c);
        return next;
      }
      const next = new Set(prev);
      for (const c of allOnPage) next.add(c);
      return next;
    });
  }

  async function handleDelete(code: string) {
    try {
      await deleteLink(code);
      toast(t("deleted"), "success");
      onChanged();
    } catch (err) {
      toast(errorMessage(err, t("deleteFailed")), "error");
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    const codes = Array.from(selected);
    const results = await Promise.allSettled(codes.map((c) => deleteLink(c)));
    const failed = results.filter((r) => r.status === "rejected").length;
    setBulkDeleting(false);
    setBulkConfirmOpen(false);
    setSelected(new Set());
    if (failed === 0) {
      toast(t("bulkDeleted", { count: codes.length }), "success");
    } else {
      toast(t("bulkDeleteFailed", { failed, total: codes.length }), "error");
    }
    onChanged();
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <span className="text-slate-700">
            {t("bulkSelectedCount", { count: selected.size })}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              {t("bulkClearSelection")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => setBulkConfirmOpen(true)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              {t("bulkDeleteAction")}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <THead>
            <TR>
              <TH className="w-[1%]">
                <input
                  type="checkbox"
                  aria-label={t("bulkSelectAll")}
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 cursor-pointer"
                />
              </TH>
              <TH>{t("table.shortUrl")}</TH>
              <TH>{t("table.originalUrl")}</TH>
              <TH className="hidden md:table-cell">
                <SortHeader
                  active={sortKey === "createdAt"}
                  dir={sortDir}
                  onClick={() => toggleSort("createdAt")}
                >
                  {t("table.createdAt")}
                </SortHeader>
              </TH>
              <TH className="hidden lg:table-cell">{t("table.expiresAt")}</TH>
              <TH className="text-right">
                <SortHeader
                  active={sortKey === "clickCount"}
                  dir={sortDir}
                  onClick={() => toggleSort("clickCount")}
                  align="right"
                >
                  {t("table.clicks")}
                </SortHeader>
              </TH>
              <TH className="w-[1%] whitespace-nowrap text-right">{t("table.actions")}</TH>
            </TR>
          </THead>
          <TBody>
            {sorted.map((item) => (
              <TR key={item.shortCode}>
                <TD>
                  <input
                    type="checkbox"
                    aria-label={t("bulkSelectRow", { code: item.shortCode })}
                    checked={selected.has(item.shortCode)}
                    onChange={() => toggleOne(item.shortCode)}
                    className="h-3.5 w-3.5 cursor-pointer"
                  />
                </TD>
                <TD>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/stats/${item.shortCode}`}
                      className="font-mono text-sm font-medium text-slate-900 hover:underline"
                    >
                      /{item.shortCode}
                    </Link>
                    <CopyButton
                      size="sm"
                      variant="ghost"
                      label=""
                      value={item.shortUrl}
                      onCopied={() => toast("✓", "success")}
                    />
                  </div>
                </TD>
                <TD className="max-w-[360px]">
                  <div className="flex flex-col gap-1">
                    <a
                      href={item.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
                      title={item.originalUrl}
                    >
                      <Favicon url={item.originalUrl} />
                      <span className="truncate text-xs">
                        {truncateMiddle(item.originalUrl, 56)}
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                    </a>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => onTagClick?.(tag)}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-200"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </TD>
                <TD className="hidden whitespace-nowrap text-xs text-slate-500 md:table-cell">
                  {formatDate(item.createdAt)}
                </TD>
                <TD className="hidden whitespace-nowrap text-xs text-slate-500 lg:table-cell">
                  {item.expiresAt ? formatDate(item.expiresAt) : "—"}
                </TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Sparkline
                      values={item.clicksLast7d ?? []}
                      className="hidden text-slate-400 sm:inline-block"
                    />
                    <span className="tabular-nums font-medium text-slate-900">
                      {formatNumber(item.clickCount)}
                    </span>
                  </div>
                </TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/stats/${item.shortCode}`}>
                      <Button variant="ghost" size="sm" aria-label={t("actions.stats")}>
                        <BarChart3 className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">{t("actions.stats")}</span>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t("actions.edit")}
                      onClick={() => setEditing(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t("actions.delete")}
                      onClick={() => setConfirmCode(item.shortCode)}
                      className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>

      <ConfirmDialog
        open={confirmCode !== null}
        onOpenChange={(o) => !o && setConfirmCode(null)}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc")}
        destructive
        confirmLabel={t("deleteOk")}
        onConfirm={async () => {
          if (confirmCode) await handleDelete(confirmCode);
        }}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={(o) => !bulkDeleting && setBulkConfirmOpen(o)}
        title={t("bulkDeleteConfirmTitle")}
        description={t("bulkDeleteConfirmDesc", { count: selected.size })}
        destructive
        confirmLabel={bulkDeleting ? t("bulkDeleting") : t("bulkDeleteAction")}
        confirmDisabled={bulkDeleting}
        onConfirm={handleBulkDelete}
      />

      <EditLinkDialog
        link={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onChanged();
        }}
      />
    </div>
  );
}

function SortHeader({
  active,
  dir,
  onClick,
  align,
  children,
}: {
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "right";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider hover:text-slate-900",
        active ? "text-slate-900" : "text-slate-500",
        align === "right" && "ml-auto",
      )}
    >
      {children}
      <ArrowUpDown className={cn("h-3 w-3", active && dir === "asc" && "rotate-180")} />
    </button>
  );
}
