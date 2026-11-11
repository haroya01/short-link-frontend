import type { AdminLinkClick, AdminLinkClicksPage } from "@/lib/api/admin";
import type { LinkEvent } from "@/lib/api/link-events";
import type { StatsLabels } from "@/lib/stats-labels";
import type { AdminLinkRow } from "@/types";

export type ClickView = "human" | "excluded";

const CLICK_BATCH_SIZE = 200;

const EXCLUDED_BOT_NAME = "preview:excluded";

export function leadClicks(row: Pick<AdminLinkRow, "clickCount" | "humanClickCount">): {
  lead: number;
  total: number | null;
} {
  return row.humanClickCount == null
    ? { lead: row.clickCount, total: null }
    : { lead: row.humanClickCount, total: row.clickCount };
}

export function inClickView(row: AdminLinkClick, view: ClickView): boolean {
  return view === "excluded" ? row.excluded : !row.excluded && !row.click.bot;
}

export function selectionState(ids: readonly number[], selected: ReadonlySet<number>): "none" | "some" | "all" {
  const picked = ids.filter((id) => selected.has(id)).length;
  if (picked === 0) return "none";
  return picked === ids.length ? "all" : "some";
}

export function toggleAll(ids: readonly number[], selected: ReadonlySet<number>): Set<number> {
  return selectionState(ids, selected) === "all" ? new Set() : new Set(ids);
}

export function toggleRange(
  ids: readonly number[],
  selected: ReadonlySet<number>,
  anchor: number | null,
  target: number,
  checked: boolean,
): Set<number> {
  const from = anchor == null ? -1 : ids.indexOf(anchor);
  const to = ids.indexOf(target);
  const span = from < 0 || to < 0 ? [target] : ids.slice(Math.min(from, to), Math.max(from, to) + 1);
  const next = new Set(selected);
  for (const id of span) {
    if (checked) next.add(id);
    else next.delete(id);
  }
  return next;
}

export function chunkIds(ids: readonly number[], size = CLICK_BATCH_SIZE): number[][] {
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size));
  return chunks;
}

export async function sendInChunks(
  ids: readonly number[],
  send: (chunk: number[]) => Promise<{ changed: number }>,
  size = CLICK_BATCH_SIZE,
): Promise<{ changed: number; error: unknown }> {
  let changed = 0;
  for (const chunk of chunkIds(ids, size)) {
    try {
      changed += (await send(chunk)).changed;
    } catch (error) {
      return { changed, error: error ?? new Error("request failed") };
    }
  }
  return { changed, error: null };
}

export function markClicks(
  rows: readonly AdminLinkClick[],
  ids: ReadonlySet<number>,
  excluded: boolean,
): AdminLinkClick[] {
  return rows.map((row) => {
    if (!ids.has(row.id) || !inClickView(row, excluded ? "human" : "excluded")) return row;
    return {
      ...row,
      excluded,
      click: { ...row.click, bot: excluded, botName: excluded ? EXCLUDED_BOT_NAME : null },
    };
  });
}

export async function loadUntilVisible(
  fetchPage: (cursor: string | null) => Promise<AdminLinkClicksPage>,
  cursor: string | null,
  view: ClickView,
  maxPages: number,
): Promise<AdminLinkClicksPage> {
  const items: AdminLinkClick[] = [];
  let next = cursor;
  for (let page = 0; page < maxPages; page++) {
    const fetched = await fetchPage(next);
    items.push(...fetched.items);
    next = fetched.nextCursor;
    if (!next || fetched.items.some((row) => inClickView(row, view))) break;
  }
  return { items, nextCursor: next };
}

export function clickPlace(click: LinkEvent, labels: StatsLabels, regionName: string | null): string {
  const parts = [click.city, regionName, click.country ? labels.country(click.country) : null].filter(
    (part): part is string => Boolean(part),
  );
  const unique = parts.filter((part, i) => parts.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === i);
  return unique.join(", ") || "—";
}

export function clickDevice(click: LinkEvent, labels: StatsLabels): string {
  return [click.device && labels.device(click.device), click.os, click.browser].filter(Boolean).join(" · ") || "—";
}

export function clickSource(click: LinkEvent, labels: StatsLabels): string {
  return click.referrerHost || (click.channel ? labels.channel(click.channel) : "—");
}
