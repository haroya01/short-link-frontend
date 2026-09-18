"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { ArrowUpDown, BarChart3, Clock3, ExternalLink, Pencil, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { StatsMorphLink } from "@/components/links/stats-morph-link";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { CopyButton } from "@/components/common/copy-button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EditLinkDialog } from "@/components/links/edit-link-dialog";
import { Favicon } from "@/components/common/favicon";
import { LiveDot } from "@/components/common/live-dot";
import { Sparkline } from "@/components/links/stats/sparkline";
import { useToast } from "@/components/ui/toast";
import { deleteLink } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { cn, formatDate, formatNumber, truncateMiddle } from "@/lib/utils";
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
            live={liveByCode?.[item.shortCode]}
            selected={selected.has(item.shortCode)}
            favorite={isFavorite(item.shortCode)}
            favoritesDisabled={favoritesDisabled}
            onToggleFavorite={() => onToggleFavorite(item.shortCode)}
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
                  disabled={sortingDisabled}
                  active={sortKey === "createdAt"}
                  dir={sortDir}
                  onClick={() => toggleSort("createdAt")}
                >
                  {t("table.createdAt")}
                </SortHeader>
              </TH>
              <TH className="hidden lg:table-cell">{t("table.expiresAt")}</TH>
              <TH className="text-right">
                <span className="block text-xs">{t("table.clicks")}</span>
                <SortHeader
                  disabled={sortingDisabled}
                  active={sortKey === "clickCount"}
                  dir={sortDir}
                  onClick={() => toggleSort("clickCount")}
                  align="right"
                >
                  {t("table.sortAllClicks")}
                </SortHeader>
              </TH>
              <TH className="w-[1%] whitespace-nowrap text-right">{t("table.actions")}</TH>
            </TR>
          </THead>
          <TBody>
            {items.map((item) => {
              const bump = liveByCode?.[item.shortCode];
              return (
              <TR
                key={item.shortCode}
                className={bump ? (bump.seq % 2 ? "click-arrive-a" : "click-arrive-b") : undefined}
              >
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
                    <FavoriteButton
                      active={isFavorite(item.shortCode)}
                        disabled={favoritesDisabled}
                      onToggle={() => onToggleFavorite(item.shortCode)}
                      label={
                        isFavorite(item.shortCode)
                          ? t("favorite.remove")
                          : t("favorite.add")
                      }
                    />
                    <StatsMorphLink
                      shortCode={item.shortCode}
                      data-vt-link-scope
                      className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100 hover:underline"
                    >
                      <span className="block max-w-52 truncate font-sans">{linkDisplayName(item)}</span><span data-vt-link-code className="block font-mono text-xs font-normal text-slate-500 dark:text-slate-400">/{item.shortCode}</span>
                    </StatsMorphLink>
                    <CopyButton
                      size="sm"
                      variant="ghost"
                      label=""
                      value={item.shortUrl}
                      onCopied={() => toast("✓", "success")}
                    />
                  </div>
                </TD>
                {/* w-full + max-w-0 — 원본 URL 열이 남는 폭만 차지하고 줄어들게 한다. td 의
                    max-width 는 auto 테이블 레이아웃이 무시해서, 긴 URL 이 표를 컨테이너 밖으로
                    밀어 액션 열이 잘리는 원인이었다. */}
                <TD className="w-full max-w-0">
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
                    {/* 7일 합이 0이면 스파크 생략 — 평평한 기준선이 숫자 밑에서 얼룩/밑줄로 읽힌다. */}
                    {(item.clicksLast7d ?? []).some((v) => v > 0) && (
                      <Sparkline
                        values={item.clicksLast7d ?? []}
                        className="hidden text-slate-400 dark:text-slate-500 lg:inline-block"
                      />
                    )}
                    {bump && <LiveDot />}
                    <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">
                      {bump ? (
                        // key=seq — 도착마다 스팬을 갈아 끼워 솟음 모션을 재시동한다.
                        <span key={bump.seq} className="count-bump">
                          {formatNumber((item.humanClickCount ?? item.clickCount) + bump.extra)}
                        </span>
                      ) : (
                        formatNumber(item.humanClickCount ?? item.clickCount)
                      )}
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
                        className="h-11 w-11"
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
                      className="h-11 w-11"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("actions.delete")}
                      title={t("actions.delete")}
                      onClick={() => setConfirmCode(item.shortCode)}
                      className="h-11 w-11 text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TD>
              </TR>
              );
            })}
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
  live,
  selected,
  favorite,
  favoritesDisabled,
  onToggleFavorite,
  onToggleSelect,
  onTagClick,
  onCopied,
  onEdit,
  onDelete,
  t,
}: {
  item: MyLink;
  index: number;
  live?: LiveBump;
  selected: boolean;
  favorite: boolean;
  favoritesDisabled?: boolean;
  onToggleFavorite: () => void;
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

  // Identity gets its own row so counts and touch targets cannot squeeze a readable title away.
  return (
    <div
      className={cn(
        "profile-fade rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]",
        live && (live.seq % 2 ? "click-arrive-a" : "click-arrive-b"),
      )}
      style={{ "--idx": Math.min(index, 8) } as CSSProperties}
    >
      <div className="flex items-start gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <Favicon url={item.originalUrl} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <StatsMorphLink
            shortCode={item.shortCode}
            data-vt-link-scope
            className="block font-semibold leading-snug text-slate-900 dark:text-slate-100 hover:underline"
          >
            <span className="block break-words text-[15px]">{linkDisplayName(item)}</span>
            <span data-vt-link-code className="block font-mono text-xs font-normal text-slate-500 dark:text-slate-400">/{item.shortCode}</span>
          </StatsMorphLink>
          <a
            href={item.originalUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            title={item.originalUrl}
          >
            <span className="truncate text-xs">{item.originalUrl}</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
          </a>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="flex items-baseline gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          {live && <LiveDot />}
          <span key={live?.seq} className={cn("font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100", live && "count-bump")}>
            {formatNumber((item.humanClickCount ?? item.clickCount) + (live?.extra ?? 0))}
          </span>
          {t("table.clicks")}
        </p>
        {weekClicks > 0 && <div className="flex items-center gap-1.5">
          <Sparkline values={last7d} width={48} height={16} className="shrink-0 text-accent-600 dark:text-accent-400" />
          <span className="text-xs font-medium tabular-nums text-accent-700 dark:text-accent-400">{t("card.week", { count: formatNumber(weekClicks) })}</span>
        </div>}
      </div>
      <div className="mt-2 space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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
              compact
              onClick={() => onTagClick?.(tag)}
            />
          ))}
          <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {formatDate(item.createdAt)}
            {expiry?.kind === "later" && item.expiresAt && (
              <span className="ml-1.5">→ {formatDate(item.expiresAt)}</span>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-1 dark:border-slate-800">
          <label className="grid h-11 w-11 cursor-pointer place-items-center">
            <input
              type="checkbox"
              aria-label={t("bulkSelectRow", { code: item.shortCode })}
              checked={selected}
              onChange={onToggleSelect}
              className="h-4 w-4 cursor-pointer"
            />
          </label>
          <CopyButton size="md" variant="ghost" label="" value={item.shortUrl} onCopied={onCopied} />
          <FavoriteButton
            active={favorite}
            disabled={favoritesDisabled}
            onToggle={onToggleFavorite}
            label={favorite ? t("favorite.remove") : t("favorite.add")}
          />
          <Link href={`/stats/${item.shortCode}`}>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("actions.stats")}
              title={t("actions.stats")}
              className="h-11 w-11"
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
            className="h-11 w-11"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("actions.delete")}
            title={t("actions.delete")}
            onClick={onDelete}
            className="h-11 w-11 text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * 별표 토글 — 계정 즐겨찾기 목록에 링크를 저장한다. 행/링크 클릭과 히트가 겹치지 않게 <button>
 * 으로 분리하고, 채움(브랜드 그린)/비움으로 상태를 나타낸다. 별칭 색은 §10.3 마커(accent-600).
 */
function FavoriteButton({
  active,
  onToggle,
  label,
  className,
  disabled,
}: {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
}) {
  // 잉크 체크는 사용자가 누른 순간에만 — 초기 렌더의 이미 켜진 별들이 일제히 튀지 않게.
  const [justToggled, setJustToggled] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={() => {
        setJustToggled(true);
        onToggle();
      }}
      className={cn(
        "focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-lg transition-colors disabled:opacity-50",
        active
          ? "text-accent-600 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-500/10"
          : "text-slate-400 dark:text-slate-500 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300",
        className,
      )}
    >
      <Star className={cn("h-3.5 w-3.5", active && "fill-current", active && justToggled && "ink-check")} />
    </button>
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
}: {
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "right";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) return <span className="text-xs font-medium">{children}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1 text-[12px] font-medium uppercase tracking-wider hover:text-slate-900 dark:hover:text-slate-100",
        active ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400",
        align === "right" && "ml-auto",
      )}
    >
      {children}
      <ArrowUpDown className={cn("h-3 w-3", active && dir === "asc" && "rotate-180")} />
    </button>
  );
}
