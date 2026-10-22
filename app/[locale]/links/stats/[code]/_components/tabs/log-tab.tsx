"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  downloadLinkEventsCsv,
  downloadLinkStatsCsv,
  getLinkEvents,
  type LinkEvent,
} from "@/lib/api/link-events";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import { formatDateTime } from "@/lib/utils";
import type { LinkStats } from "@/types";
import { DemoBadge } from "./settings-tab";

const DEMO_EVENTS: LinkEvent[] = [
  { clickedAt: "2026-05-10T11:14:08Z", country: "KR", region: null, city: "Seoul", device: "mobile", os: "iOS", browser: "Safari", referrer: null, referrerHost: "instagram.com", channel: "social", language: "ko", bot: false, botName: null, ipMasked: null },
  { clickedAt: "2026-05-10T10:52:41Z", country: "JP", region: null, city: "Tokyo", device: "desktop", os: "macOS", browser: "Chrome", referrer: null, referrerHost: "x.com", channel: "social", language: "ja", bot: false, botName: null, ipMasked: null },
  { clickedAt: "2026-05-10T10:31:02Z", country: "US", region: null, city: null, device: null, os: null, browser: null, referrer: null, referrerHost: null, channel: null, language: null, bot: true, botName: "Slackbot", ipMasked: null },
];

export function LogTab({ data, demo = false }: { data: LinkStats; demo?: boolean }) {
  const t = useTranslations("stats.rawData");
  const tc = useTranslations("common");
  const tDemo = useTranslations("demo.settingsDemo");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const shortCode = data.shortCode;

  const [busy, setBusy] = useState<null | "events" | "stats">(null);
  const [events, setEvents] = useState<LinkEvent[]>(demo ? DEMO_EVENTS : []);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(!demo);
  const [loadedOnce, setLoadedOnce] = useState(demo);

  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    getLinkEvents(shortCode, null)
      .then((page) => {
        if (cancelled) return;
        setEvents(page.items);
        setCursor(page.nextCursor);
        setLoadedOnce(true);
      })
      .catch((e) => {
        if (!cancelled) toast(errorMessage(e, t("logLoadFailed")), "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortCode, demo]);

  async function loadMore() {
    if (loading || !cursor) return;
    setLoading(true);
    try {
      const page = await getLinkEvents(shortCode, cursor);
      setEvents((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (e) {
      toast(errorMessage(e, t("logLoadFailed")), "error");
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv(kind: "events" | "stats") {
    if (demo) {
      toast(tDemo("lockedToast"), "default");
      return;
    }
    if (busy) return;
    setBusy(kind);
    try {
      await (kind === "events"
        ? downloadLinkEventsCsv(shortCode)
        : downloadLinkStatsCsv(shortCode, "daily"));
    } catch (e) {
      toast(errorMessage(e, t("exportFailed")), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card-flat dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {demo && <span className="mr-auto"><DemoBadge /></span>}
        <Button type="button" size="sm" variant="ghost" disabled={demo || busy !== null} onClick={() => exportCsv("events")}>
          {busy === "events" ? t("exporting") : t("exportEvents")}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={demo || busy !== null} onClick={() => exportCsv("stats")}>
          {busy === "stats" ? t("exporting") : t("exportStats")}
        </Button>
      </div>

      <div className="mt-4">
        {!loadedOnce && loading && <p className="text-xs text-slate-500 dark:text-slate-400">{tc("loading")}</p>}
        {loadedOnce && events.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("empty")}</p>
        )}
        {events.length > 0 && (
          <>
            <ul className="sm:hidden">
              {events.map((e, i) => (
                <li key={i} className="border-b border-slate-100 py-2 text-[12px] dark:border-slate-800">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="whitespace-nowrap font-mono tabular-nums text-slate-600 dark:text-slate-300">{formatDateTime(e.clickedAt)}</span>
                    <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">{referrerOf(e)}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-slate-700 dark:text-slate-200">
                    <span>{locationOf(e)}</span>
                    <span aria-hidden className="text-slate-300 dark:text-slate-600">·</span>
                    <DeviceCell event={e} botLabel={t("bot")} />
                  </div>
                </li>
              ))}
            </ul>
            <table className="hidden w-full border-collapse text-[12px] sm:table">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-1.5 pr-3 font-medium">{t("colTime")}</th>
                  <th className="py-1.5 pr-3 font-medium">{t("colLocation")}</th>
                  <th className="py-1.5 pr-3 font-medium">{t("colDevice")}</th>
                  <th className="py-1.5 pr-3 font-medium">{t("colReferrer")}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={i} className="border-b border-slate-100 align-top dark:border-slate-800">
                    <td className="whitespace-nowrap py-1.5 pr-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {formatDateTime(e.clickedAt)}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200">{locationOf(e)}</td>
                    <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200">
                      <DeviceCell event={e} botLabel={t("bot")} />
                    </td>
                    <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200">{referrerOf(e)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {cursor && (
          <div className="mt-3">
            <Button type="button" size="sm" variant="ghost" disabled={loading} onClick={loadMore}>
              {loading ? tc("loading") : t("loadMore")}
            </Button>
          </div>
        )}
        {data.rawSince && data.rawRetentionDays ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t("retention", { days: data.rawRetentionDays })}</p>
        ) : null}
      </div>
    </section>
  );
}

function locationOf(e: LinkEvent) {
  return [e.city, e.country].filter(Boolean).join(", ") || "—";
}

function referrerOf(e: LinkEvent) {
  return e.referrerHost || e.channel || "—";
}

function DeviceCell({ event, botLabel }: { event: LinkEvent; botLabel: string }) {
  if (!event.bot) return <>{[event.device, event.os, event.browser].filter(Boolean).join(" · ") || "—"}</>;
  return (
    <span className="inline-flex items-center gap-1">
      <Bot aria-hidden className="h-3.5 w-3.5 text-slate-400" />
      {event.botName ?? botLabel}
    </span>
  );
}
