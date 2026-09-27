"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { ArrowUpDown, ExternalLink, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatsMorphLink } from "@/components/links/stats-morph-link";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/common/copy-button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EditLinkDialog } from "@/components/links/edit-link-dialog";
import { LiveDot } from "@/components/common/live-dot";
import { useToast } from "@/components/ui/toast";
import { deleteLink } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { cn, formatNumber } from "@/lib/utils";
import { linkDisplayName } from "@/lib/link-library-view";
import type { MyLink } from "@/types";

type SortKey = "createdAt" | "clickCount";
type SortDir = "asc" | "desc";

/**
 * 라이브 클릭 가산분 — extra 는 서버 재조회가 실값을 실어올 때 0 으로 접히고, seq 는 세션 내
 * 도착 횟수로 남아 도착 모션 재시동(홀짝 클래스)과 라이브 닷 유지의 키가 된다.
 */
export type LiveBump = { extra: number; seq: number };

type Props = {
  items: MyLink[];
  onChanged: () => void;
  onTagClick?: (tag: string) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSortChange: (key: SortKey, dir: SortDir) => void;
  isFavorite: (shortCode: string) => boolean;
  onToggleFavorite: (shortCode: string) => void;
  /** 계정 클릭 스트림이 실어온 행별 라이브 신호(없으면 정적 렌더). */
  liveByCode?: Record<string, LiveBump>;
  favoritesDisabled?: boolean;
  sortingDisabled?: boolean;
};

export function LinksTable({
  items,
  onChanged,
  onTagClick,
  sortKey,
  sortDir,
  onSortChange,
  isFavorite,
  onToggleFavorite,
  liveByCode,
  favoritesDisabled = false,
  sortingDisabled = false,
}: Props) {
  const t = useTranslations("dashboard");
  const [confirmCode, setConfirmCode] = useState<string | null>(null);
  const [editing, setEditing] = useState<MyLink | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();

  const allOnPage = items.map((s) => s.shortCode);
  const allSelected = allOnPage.length > 0 && allOnPage.every((c) => selected.has(c));
  const someSelected = !allSelected && allOnPage.some((c) => selected.has(c));

  function toggleSort(key: SortKey) {
    if (sortingDisabled) return;
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

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-1 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-4">
          <label className={cn("h-11 w-5 cursor-pointer place-items-center sm:grid", selectMode ? "grid" : "hidden")}>
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
          </label>
          <div className="flex-1">
            <SortHeader
              disabled={sortingDisabled}
              active={sortKey === "createdAt"}
              dir={sortDir}
              dirLabel={sortDir === "asc" ? t("table.sortAsc") : t("table.sortDesc")}
              onClick={() => toggleSort("createdAt")}
            >
              {t("table.sortNewest")}
            </SortHeader>
          </div>
          <SortHeader
            disabled={sortingDisabled}
            active={sortKey === "clickCount"}
            dir={sortDir}
            dirLabel={sortDir === "asc" ? t("table.sortAsc") : t("table.sortDesc")}
            onClick={() => toggleSort("clickCount")}
            align="right"
          >
            {t("table.sortAllClicks")}
          </SortHeader>
          <button
            type="button"
            onClick={() => {
              if (selectMode) setSelected(new Set());
              setSelectMode((v) => !v);
            }}
            className="focus-ring min-h-11 px-1 text-xs font-medium text-accent-700 dark:text-accent-400 sm:hidden"
          >
            {selectMode ? t("selectDone") : t("selectMode")}
          </button>
          <span className="hidden w-[136px] sm:block" aria-hidden />
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => {
            const bump = liveByCode?.[item.shortCode];
            const expiry = expiryState(item.expiresAt);
            const favorite = isFavorite(item.shortCode);
            return (
              <li
                key={item.shortCode}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 transition-colors last:rounded-b-2xl hover:bg-slate-50/70 dark:hover:bg-slate-800/40 sm:px-4",
                  bump && (bump.seq % 2 ? "click-arrive-a" : "click-arrive-b"),
                )}
              >
                <label className={cn("h-11 w-5 cursor-pointer place-items-center sm:grid", selectMode ? "grid" : "hidden")}>
                  <input
                    type="checkbox"
                    aria-label={t("bulkSelectRow", { code: item.shortCode })}
                    checked={selected.has(item.shortCode)}
                    onChange={() => toggleOne(item.shortCode)}
                    className="h-3.5 w-3.5 cursor-pointer"
                  />
                </label>
                <StatsMorphLink
                  shortCode={item.shortCode}
                  data-vt-link-scope
                  className="focus-ring min-w-0 flex-1 rounded-md py-0.5"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                      {linkDisplayName(item)}
                    </span>
                    {favorite && <Star aria-label={t("favorite.filter")} className="h-3 w-3 shrink-0 fill-current text-accent-600 dark:text-accent-400" />}
                    {expiry?.kind === "expired" && (
                      <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{t("card.expired")}</span>
                    )}
                    {expiry?.kind === "soon" && (
                      <span className="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400">
                        {expiry.days === 0 ? t("card.expiresToday") : t("card.expiresIn", { days: expiry.days })}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <span data-vt-link-code className="shrink-0">/{item.shortCode}</span>
                    {item.tags && item.tags.length > 0 && (
                      <span className="shrink-0 lg:hidden">#{item.tags[0]}{item.tags.length > 1 ? ` +${item.tags.length - 1}` : ""}</span>
                    )}
                    {item.note?.trim() && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="truncate" title={item.originalUrl}>{hostOf(item.originalUrl)}</span>
                      </>
                    )}
                  </span>
                </StatsMorphLink>
                {item.tags && item.tags.length > 0 && (
                  <div className="hidden max-w-[180px] flex-wrap justify-end gap-1 lg:flex">
                    {item.tags.slice(0, 3).map((tag) => (
                      <TagFilterChip key={tag} tag={tag} compact onClick={() => onTagClick?.(tag)} />
                    ))}
                  </div>
                )}
                <div className="flex shrink-0 items-center gap-1.5 text-right">
                  {bump && <LiveDot />}
                  <span className="min-w-[3ch] text-[15px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {bump ? (
                      <span key={bump.seq} className="count-bump">
                        {formatNumber((item.humanClickCount ?? item.clickCount) + bump.extra)}
                      </span>
                    ) : (
                      formatNumber(item.humanClickCount ?? item.clickCount)
                    )}
                  </span>
                </div>
                <div className="flex shrink-0 items-center">
                  <CopyButton size="sm" variant="ghost" label="" value={item.shortUrl} onCopied={() => toast(t("copied"), "success")} />
                  <RowMenu
                    label={t("actions.more")}
                    items={[
                      {
                        label: favorite ? t("favorite.remove") : t("favorite.add"),
                        icon: Star,
                        disabled: favoritesDisabled,
                        onSelect: () => onToggleFavorite(item.shortCode),
                      },
                      { label: t("actions.openOriginal"), icon: ExternalLink, href: item.originalUrl },
                      { label: t("actions.edit"), icon: Pencil, onSelect: () => setEditing(item) },
                      { label: t("actions.delete"), icon: Trash2, destructive: true, onSelect: () => setConfirmCode(item.shortCode) },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
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

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

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

type RowMenuItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onSelect?: () => void;
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
};

function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const items = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
    items()[0]?.focus();
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
      "flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 text-left text-sm transition-colors disabled:opacity-50",
      destructive
        ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
    );

  return (
    <div ref={ref} className="relative">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="h-11 w-11 text-slate-500 dark:text-slate-400"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {items.map(({ label: itemLabel, icon: Icon, onSelect, href, destructive, disabled }) =>
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
                role="menuitem"
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                  onSelect?.();
                }}
                className={itemClass(destructive)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {itemLabel}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Tag filter chip used in both the desktop table row and the mobile card. Matches TagChip's
 * tokens (focus-ring, px-3 py-1.5, text-[13px] font-medium, accent hover) but rendered as a
 * <button> (not an anchor) because it applies a filter via onClick rather than navigating.
 */
function TagFilterChip({
  tag,
  compact,
  onClick,
}: {
  tag: string;
  /** 압축 카드의 메타 행용 — 만료 칩과 같은 높이(text-[10px])로 줄인다. */
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring inline-flex items-center rounded-full font-medium transition-colors bg-slate-100 text-slate-600 hover:bg-accent-50 hover:text-accent-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-accent-500/15 dark:hover:text-accent-400",
        compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1.5 text-[13px]",
      )}
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
  disabled,
  dirLabel,
}: {
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "right";
  disabled?: boolean;
  children: React.ReactNode;
  dirLabel: string;
}) {
  if (disabled) return <span className="text-xs font-medium">{children}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1 text-xs font-medium hover:text-slate-900 dark:hover:text-slate-100",
        active ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400",
        align === "right" && "ml-auto",
      )}
    >
      {children}
      {active && <span className="sr-only">{dirLabel}</span>}
      <ArrowUpDown aria-hidden className={cn("h-3 w-3", active && dir === "asc" && "rotate-180")} />
    </button>
  );
}
