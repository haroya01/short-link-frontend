"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { ArrowUpDown, BarChart3, Clock3, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { CopyButton } from "@/components/common/copy-button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EditLinkDialog } from "@/components/links/edit-link-dialog";
import { Favicon } from "@/components/common/favicon";
import { Sparkline } from "@/components/links/stats/sparkline";
import { useToast } from "@/components/ui/toast";
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
  sortKey: SortKey;
  sortDir: SortDir;
  onSortChange: (key: SortKey, dir: SortDir) => void;
};

export function LinksTable({
  items,
  onChanged,
  onTagClick,
  sortKey,
  sortDir,
  onSortChange,
}: Props) {
  const t = useTranslations("dashboard");
  const [confirmCode, setConfirmCode] = useState<string | null>(null);
  const [editing, setEditing] = useState<MyLink | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();

  const allOnPage = items.map((s) => s.shortCode);
  const allSelected = allOnPage.length > 0 && allOnPage.every((c) => selected.has(c));
  const someSelected = !allSelected && allOnPage.some((c) => selected.has(c));

  function toggleSort(key: SortKey) {
    if (sortKey !== key) {
      onSortChange(key, "desc");
    } else {
      onSortChange(key, sortDir === "asc" ? "desc" : "asc");
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
        <div className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs">
          <span className="text-slate-700 dark:text-slate-300">
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

      {/* Mobile card list — table columns don't fit a phone viewport, so each row becomes a
          metric card: favicon tile + shortCode as the title, click count as the hero number,
          the 7-day sparkline (desktop-only in the table) surfaced, and expiry as a status chip.
          Desktop keeps the table view. */}
      <div className="space-y-2.5 sm:hidden">
        {items.map((item, index) => (
          <MobileLinkCard
            key={item.shortCode}
            item={item}
            index={index}
            selected={selected.has(item.shortCode)}
            onToggleSelect={() => toggleOne(item.shortCode)}
            onTagClick={onTagClick}
            onCopied={() => toast("✓", "success")}
            onEdit={() => setEditing(item)}
            onDelete={() => setConfirmCode(item.shortCode)}
            t={t}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sm:block">
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
            {items.map((item) => (
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
                      className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100 hover:underline"
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
                <TD className="max-w-[260px]">
                  <div className="flex flex-col gap-1">
                    <a
                      href={item.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                      title={item.originalUrl}
                    >
                      <Favicon url={item.originalUrl} />
                      <span className="truncate text-xs">
                        {truncateMiddle(item.originalUrl, 42)}
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                    </a>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <TagFilterChip
                            key={tag}
                            tag={tag}
                            onClick={() => onTagClick?.(tag)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </TD>
                <TD className="hidden whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 md:table-cell">
                  {formatDate(item.createdAt)}
                </TD>
                <TD className="hidden whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 lg:table-cell">
                  {item.expiresAt ? formatDate(item.expiresAt) : "—"}
                </TD>
                <TD className="whitespace-nowrap text-right">
                  <div className="inline-flex items-center gap-2">
                    <Sparkline
                      values={item.clicksLast7d ?? []}
                      className="hidden text-slate-400 dark:text-slate-500 lg:inline-block"
                    />
                    <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">
                      {formatNumber(item.clickCount)}
                    </span>
                  </div>
                </TD>
                <TD className="whitespace-nowrap text-right">
                  <div className="inline-flex flex-nowrap items-center gap-0.5">
                    <Link href={`/stats/${item.shortCode}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("actions.stats")}
                        title={t("actions.stats")}
                        className="h-8 w-8"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("actions.edit")}
                      title={t("actions.edit")}
                      onClick={() => setEditing(item)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("actions.delete")}
                      title={t("actions.delete")}
                      onClick={() => setConfirmCode(item.shortCode)}
                      className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
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

type ExpiryState =
  | { kind: "expired" }
  | { kind: "soon"; days: number }
  | { kind: "later" }
  | null;

function expiryState(expiresAt: string | null | undefined): ExpiryState {
  if (!expiresAt) return null;
  const expires = +new Date(expiresAt);
  if (!Number.isFinite(expires)) return null;
  const now = Date.now();
  if (expires < now) return { kind: "expired" };
  const days = Math.floor((expires - now) / 86_400_000);
  if (days <= 7) return { kind: "soon", days };
  return { kind: "later" };
}

function MobileLinkCard({
  item,
  index,
  selected,
  onToggleSelect,
  onTagClick,
  onCopied,
  onEdit,
  onDelete,
  t,
}: {
  item: MyLink;
  index: number;
  selected: boolean;
  onToggleSelect: () => void;
  onTagClick?: (tag: string) => void;
  onCopied: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: ReturnType<typeof useTranslations<"dashboard">>;
}) {
  const last7d = item.clicksLast7d ?? [];
  const weekClicks = last7d.reduce((sum, n) => sum + n, 0);
  const expiry = expiryState(item.expiresAt);

  return (
    <div
      className="profile-fade rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-transform duration-200 ease-[var(--ease)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
      style={{ "--idx": Math.min(index, 8) } as CSSProperties}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          aria-label={t("bulkSelectRow", { code: item.shortCode })}
          checked={selected}
          onChange={onToggleSelect}
          className="mt-2.5 h-3.5 w-3.5 shrink-0 cursor-pointer"
        />
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <Favicon url={item.originalUrl} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <Link
              href={`/stats/${item.shortCode}`}
              className="truncate font-mono text-[15px] font-semibold leading-tight text-slate-900 dark:text-slate-100 hover:underline"
            >
              /{item.shortCode}
            </Link>
            <CopyButton
              size="sm"
              variant="ghost"
              label=""
              value={item.shortUrl}
              onCopied={onCopied}
            />
          </div>
          <a
            href={item.originalUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            title={item.originalUrl}
          >
            <span className="truncate text-xs">{truncateMiddle(item.originalUrl, 40)}</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
          </a>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-2xl font-semibold leading-none tabular-nums text-slate-900 dark:text-slate-100">
            {formatNumber(item.clickCount)}
          </p>
          <p className="mt-1 text-[11px] leading-none text-slate-500 dark:text-slate-400">
            {t("ops.clicks")}
          </p>
        </div>
      </div>

      {last7d.length > 0 && (
        <div className="mt-3 flex items-center gap-2.5">
          <Sparkline
            values={last7d}
            width={96}
            height={22}
            className="shrink-0 text-accent-600 dark:text-accent-400"
          />
          <span
            className={cn(
              "text-[12px]",
              weekClicks > 0
                ? "font-medium text-accent-700 dark:text-accent-400"
                : "text-slate-500 dark:text-slate-400",
            )}
          >
            {t("card.week", {
              count: weekClicks > 0 ? `+${formatNumber(weekClicks)}` : "0",
            })}
          </span>
        </div>
      )}

      {(expiry?.kind === "expired" || expiry?.kind === "soon" || (item.tags?.length ?? 0) > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {expiry?.kind === "expired" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-300">
              <Clock3 className="h-2.5 w-2.5" />
              {t("card.expired")}
            </span>
          )}
          {expiry?.kind === "soon" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
              <Clock3 className="h-2.5 w-2.5" />
              {expiry.days === 0 ? t("card.expiresToday") : t("card.expiresIn", { days: expiry.days })}
            </span>
          )}
          {item.tags?.map((tag) => (
            <TagFilterChip
              key={tag}
              tag={tag}
              onClick={() => onTagClick?.(tag)}
            />
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5">
        <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
          {formatDate(item.createdAt)}
          {expiry?.kind === "later" && item.expiresAt && (
            <span className="ml-2 text-slate-500 dark:text-slate-400">→ {formatDate(item.expiresAt)}</span>
          )}
        </span>
        <div className="inline-flex shrink-0 items-center gap-0.5">
          <Link href={`/stats/${item.shortCode}`}>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("actions.stats")}
              title={t("actions.stats")}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("actions.edit")}
            title={t("actions.edit")}
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("actions.delete")}
            title={t("actions.delete")}
            onClick={onDelete}
            className="text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Tag filter chip used in both the desktop table row and the mobile card. Matches TagChip's
 * tokens (focus-ring, px-3 py-1.5, text-[13px] font-medium, accent hover) but rendered as a
 * <button> (not an anchor) because it applies a filter via onClick rather than navigating.
 */
function TagFilterChip({ tag, onClick }: { tag: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors bg-slate-100 text-slate-600 hover:bg-accent-50 hover:text-accent-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-accent-500/15 dark:hover:text-accent-400"
    >
      {tag}
    </button>
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
        "inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider hover:text-slate-900 dark:hover:text-slate-100",
        active ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400",
        align === "right" && "ml-auto",
      )}
    >
      {children}
      <ArrowUpDown className={cn("h-3 w-3", active && dir === "asc" && "rotate-180")} />
    </button>
  );
}
