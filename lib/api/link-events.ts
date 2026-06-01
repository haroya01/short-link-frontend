import { request, requestBlob } from "./client";

/** One raw click on a short link — the per-event detail behind the aggregated stats. */
export interface LinkEvent {
  clickedAt: string;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  referrer: string | null;
  referrerHost: string | null;
  channel: string | null;
  language: string | null;
  bot: boolean;
  botName: string | null;
  ipMasked: string | null;
}

export interface LinkEventsPage {
  items: LinkEvent[];
  nextCursor: string | null;
}

/** Cursor-paginated raw click log for a link the caller owns. */
export async function getLinkEvents(
  shortCode: string,
  cursor?: string | null,
  limit = 50,
): Promise<LinkEventsPage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return request<LinkEventsPage>(`/api/v1/links/${shortCode}/events?${params}`, { method: "GET" });
}

/** Trigger a browser download of an authenticated CSV export (events or a stats dimension). */
async function downloadCsv(path: string, fallbackName: string): Promise<void> {
  const { blob, filename } = await requestBlob(path, { method: "GET" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadLinkEventsCsv(shortCode: string): Promise<void> {
  return downloadCsv(`/api/v1/links/${shortCode}/events.csv`, `${shortCode}-events.csv`);
}

export function downloadLinkStatsCsv(shortCode: string, dimension = "daily"): Promise<void> {
  return downloadCsv(
    `/api/v1/links/${shortCode}/stats.csv?dimension=${encodeURIComponent(dimension)}`,
    `${shortCode}-${dimension}.csv`,
  );
}
