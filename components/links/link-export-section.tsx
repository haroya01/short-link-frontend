"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  downloadLinkEventsCsv,
  downloadLinkStatsCsv,
  getLinkEvents,
  type LinkEvent,
} from "@/lib/api/link-events";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Raw-data surface for a link the owner holds: CSV exports (click events + a daily-stats
 * dimension) and a cursor-paginated raw click log. The aggregated charts answer "how many / from
 * where"; this answers "show me the actual rows" and "let me take the data elsewhere".
 */
export function LinkExportSection({ shortCode }: { shortCode: string }) {
  const t = useTranslations("stats.rawData");
  const tc = useTranslations("common");
  const { toast } = useToast();

  const [busy, setBusy] = useState<null | "events" | "stats">(null);
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<LinkEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  async function exportCsv(kind: "events" | "stats") {
    if (busy) return;
    setBusy(kind);
    try {
      await (kind === "events"
        ? downloadLinkEventsCsv(shortCode)
        : downloadLinkStatsCsv(shortCode, "daily"));
    } catch (e) {
      toast(e instanceof Error ? e.message : tc("errorTitle"), "default");
    } finally {
      setBusy(null);
    }
  }

  async function loadEvents(next?: string | null) {
    if (loading) return;
    setLoading(true);
    try {
      const page = await getLinkEvents(shortCode, next ?? null);
      setEvents((prev) => (next ? [...prev, ...page.items] : page.items));
      setCursor(page.nextCursor);
      setLoadedOnce(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : tc("errorTitle"), "default");
    } finally {
      setLoading(false);
    }
  }

  function toggleLog() {
    const next = !open;
    setOpen(next);
    if (next && !loadedOnce) void loadEvents();
  }

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold tracking-headline text-slate-900 dark:text-slate-100">
          {t("title")}
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t("description")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={busy !== null} onClick={() => exportCsv("events")}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {busy === "events" ? t("exporting") : t("exportEvents")}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy !== null} onClick={() => exportCsv("stats")}>
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          {busy === "stats" ? t("exporting") : t("exportStats")}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={toggleLog}>
          {open ? t("hideLog") : t("showLog")}
        </Button>
      </div>

      {open && (
        <div className="mt-4">
          {!loadedOnce && loading && <p className="text-xs text-slate-500 dark:text-slate-400">{tc("loading")}</p>}
          {loadedOnce && events.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("empty")}</p>
          )}
          {events.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-[11px] uppercase text-slate-500 dark:border-slate-700">
                    <th className="py-1.5 pr-3 font-medium">{t("colTime")}</th>
                    <th className="py-1.5 pr-3 font-medium">{t("colLocation")}</th>
                    <th className="py-1.5 pr-3 font-medium">{t("colDevice")}</th>
                    <th className="py-1.5 pr-3 font-medium">{t("colReferrer")}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800 align-top dark:border-slate-800">
                      <td className="py-1.5 pr-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {new Date(e.clickedAt).toLocaleString()}
                      </td>
                      <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200">
                        {[e.city, e.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200">
                        {e.bot
                          ? `🤖 ${e.botName ?? t("bot")}`
                          : [e.device, e.os, e.browser].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200">
                        {e.referrerHost || e.channel || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {cursor && (
            <div className="mt-3">
              <Button type="button" size="sm" variant="ghost" disabled={loading} onClick={() => loadEvents(cursor)}>
                {loading ? tc("loading") : t("loadMore")}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
