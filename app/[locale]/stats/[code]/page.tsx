"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { ApiError, getStats } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/copy-button";
import { PublicStatsToggle } from "@/components/public-stats-toggle";
import { QrButton } from "@/components/qr-button";
import { ShareButton } from "@/components/share-button";
import { Reveal } from "@/components/reveal";
import { Section } from "@/components/section";
import { StatsCards } from "@/components/stats-cards";
import { LiveClickFeed } from "@/components/live-click-feed";
import { ClickQualitySummary } from "@/components/click-quality-summary";
import { LinkWebhooksSection } from "@/components/link-webhooks-section";
import { LinkDestinationsSection } from "@/components/link-destinations-section";
import { DailyChart } from "@/components/charts/daily-chart";
import { HourChart } from "@/components/charts/hour-chart";
import { Heatmap } from "@/components/charts/heatmap";
import { DeviceChart } from "@/components/charts/device-chart";
import { ReferrerChart } from "@/components/charts/referrer-chart";
import { CountryTable } from "@/components/country-table";
import { BreakdownList } from "@/components/breakdown-list";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/toast";
import type { LinkStats } from "@/types";

export default function StatsPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const t = useTranslations("stats");
  const tResult = useTranslations("result");
  const { authenticated, ready } = useAuth();
  const { toast } = useToast();
  const code = params.code;

  const [data, setData] = useState<LinkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [shortUrl, setShortUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShortUrl(`${window.location.protocol}//${window.location.host}/${code}`);
    }
  }, [code]);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setLoading(false);
      return;
    }
    if (!code) return;
    let cancelled = false;
    // Only the first fetch shows the loading skeleton; subsequent refreshes (e.g., the live-click
    // feed bumping `tick` on every incoming SSE event) update silently in the background so the
    // already-rendered page — including LiveClickFeed's accumulated items — doesn't unmount.
    const isInitial = data === null;
    if (isInitial) setLoading(true);
    setError(null);
    getStats(code)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setData(null);
            setError(null);
          } else {
            setError(err instanceof Error ? err.message : "load failed");
          }
        }
      })
      .finally(() => {
        if (!cancelled && isInitial) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // data omitted from deps on purpose — only auth/code/tick should trigger refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, code, tick]);

  if (ready && !authenticated) {
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{t("loginRequired")}</h1>
        <p className="mt-2 text-sm text-slate-500">{t("loginRequiredDesc")}</p>
        <Link href="/login" className="mt-6 inline-block">
          <Button>{t("backToDashboard")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl space-y-5 py-10">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("back")}
      </button>

      {loading ? (
        <HeaderSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setTick((n) => n + 1)} />
      ) : !data ? (
        <EmptyState
          title={t("notFound")}
          description={t("notFoundDesc")}
          action={
            <Link href="/dashboard">
              <Button variant="outline">{t("backToDashboard")}</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Header
            data={data}
            shortUrl={shortUrl}
            shortCodeLabel={t("shortCode")}
            onCopy={() => toast(tResult("copied"), "success")}
          />

          {data.totalClicks === 0 && <StatsEmptyState shortUrl={shortUrl || `/${data.shortCode}`} />}

          <StatsCards
            total={data.totalClicks}
            human={data.humanClicks}
            bot={data.botClicks}
            unique={data.uniqueClicks}
            timeToFirstClickMinutes={data.timeToFirstClickMinutes}
            velocityRatio={data.velocity?.ratio ?? 0}
          />

          <ClickQualitySummary data={data} />

          <LiveClickFeed shortCode={data.shortCode} onTick={() => setTick((n) => n + 1)} />

          <LinkDestinationsSection
            shortCode={data.shortCode}
            destinationClicks={data.destinationClicks}
            onChanged={() => setTick((n) => n + 1)}
          />

          <LinkWebhooksSection shortCode={data.shortCode} />

          <Reveal>
            <Section
              title={t("section.heatmap.title")}
              description={t("section.heatmap.desc", { tz: data.timezone })}
            >
              <Heatmap data={data.heatmap} />
            </Section>
          </Reveal>

          <Reveal delay={80}>
            <div className="grid gap-4 lg:grid-cols-3">
              <Section
                id="section-daily"
                title={t("section.daily.title")}
                description={t("section.daily.desc", { tz: data.timezone })}
                className="lg:col-span-2"
              >
                <DailyChart data={data.dailyClicks} />
              </Section>
              <Section
                id="section-hourly"
                title={t("section.hourly.title")}
                description={t("section.hourly.desc")}
              >
                <HourChart data={data.hourClicks} />
              </Section>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Section
                id="section-device"
                title={t("section.device.title")}
                description={t("section.device.desc")}
              >
                <DeviceChart data={data.deviceClicks} />
              </Section>
              <Section title={t("section.channel.title")} description={t("section.channel.desc")}>
                <BreakdownList
                  items={data.channelClicks.map((c) => ({ label: c.channel, count: c.count }))}
                />
              </Section>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Section title={t("section.os.title")} description={t("section.os.desc")}>
                <BreakdownList
                  items={data.osClicks.map((o) => ({ label: o.os, count: o.count }))}
                />
              </Section>
              <Section title={t("section.browser.title")} description={t("section.browser.desc")}>
                <BreakdownList
                  items={data.browserClicks.map((b) => ({ label: b.browser, count: b.count }))}
                />
              </Section>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Section
                title={t("section.referrerHost.title")}
                description={t("section.referrerHost.desc")}
              >
                <BreakdownList
                  items={data.referrerHostClicks.map((r) => ({ label: r.host, count: r.count }))}
                />
              </Section>
              <Section
                title={t("section.referrerUrl.title")}
                description={t("section.referrerUrl.desc")}
              >
                <ReferrerChart data={data.referrerClicks} />
              </Section>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Section
                title={t("section.utmSource.title")}
                description={t("section.utmSource.desc")}
              >
                {data.utmSourceClicks.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">{t("noUtm")}</p>
                ) : (
                  <BreakdownList
                    items={data.utmSourceClicks.map((u) => ({
                      label: u.source,
                      count: u.count,
                    }))}
                  />
                )}
              </Section>
              <Section
                title={t("section.utmMedium.title")}
                description={t("section.utmMedium.desc")}
              >
                {data.utmMediumClicks.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">{t("noUtm")}</p>
                ) : (
                  <BreakdownList
                    items={data.utmMediumClicks.map((u) => ({
                      label: u.medium,
                      count: u.count,
                    }))}
                  />
                )}
              </Section>
              <Section title={t("section.utm.title")} description={t("section.utm.desc")}>
                {data.utmCampaignClicks.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">{t("noUtm")}</p>
                ) : (
                  <BreakdownList
                    items={data.utmCampaignClicks.map((u) => ({
                      label: u.campaign,
                      count: u.count,
                    }))}
                  />
                )}
              </Section>
              <Section
                title={t("section.utmContent.title")}
                description={t("section.utmContent.desc")}
              >
                {data.utmContentClicks.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">{t("noUtm")}</p>
                ) : (
                  <BreakdownList
                    items={data.utmContentClicks.map((u) => ({
                      label: u.content,
                      count: u.count,
                    }))}
                  />
                )}
              </Section>
              <Section
                title={t("section.srcChannel.title")}
                description={t("section.srcChannel.desc")}
              >
                {data.sourceChannelClicks.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">
                    {t("section.srcChannel.empty")}
                  </p>
                ) : (
                  <BreakdownList
                    items={data.sourceChannelClicks.map((s) => ({
                      label: s.source,
                      count: s.count,
                    }))}
                  />
                )}
              </Section>
              <Section
                id="section-bots"
                title={t("section.bots.title")}
                description={t("section.bots.desc")}
              >
                {data.botClicks2.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">{t("noBot")}</p>
                ) : (
                  <BreakdownList
                    items={data.botClicks2.map((b) => ({ label: b.bot, count: b.count }))}
                  />
                )}
              </Section>
            </div>
          </Reveal>

          <Reveal>
            <Section title={t("section.country.title")} description={t("section.country.desc")}>
              <CountryTable data={data.countryClicks} />
            </Section>
          </Reveal>

          <Reveal delay={60}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Section title={t("section.region.title")} description={t("section.region.desc")}>
                <BreakdownList
                  items={data.regionClicks.map((r) => ({ label: r.region, count: r.count }))}
                />
              </Section>
              <Section title={t("section.city.title")} description={t("section.city.desc")}>
                <BreakdownList
                  items={data.cityClicks.map((c) => ({ label: c.city, count: c.count }))}
                />
              </Section>
            </div>
          </Reveal>

          <Reveal>
            <Section title={t("section.language.title")} description={t("section.language.desc")}>
              <BreakdownList
                items={data.languageClicks.map((l) => ({ label: l.language, count: l.count }))}
              />
            </Section>
          </Reveal>

          <Reveal>
            <Section
              title={t("section.asn.title")}
              description={t("section.asn.desc", { dc: data.datacenterClicks })}
            >
              {data.asnClicks.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">{t("section.asn.empty")}</p>
              ) : (
                <BreakdownList
                  items={data.asnClicks.map((a) => ({
                    label: a.organization + (a.asn ? ` (AS${a.asn})` : ""),
                    count: a.count,
                  }))}
                />
              )}
            </Section>
          </Reveal>
        </>
      )}
    </div>
  );
}

function Header({
  data,
  shortUrl,
  shortCodeLabel,
  onCopy,
}: {
  data: LinkStats;
  shortUrl: string;
  shortCodeLabel: string;
  onCopy: () => void;
}) {
  const display = shortUrl || `/${data.shortCode}`;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {shortCodeLabel}
        </p>
        <a
          href={display}
          target="_blank"
          rel="noreferrer"
          className="group mt-1 block truncate font-mono text-lg font-semibold text-slate-900 hover:text-accent-700 hover:underline"
        >
          /{data.shortCode}
        </a>
        <a
          href={display}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-slate-500 hover:text-slate-900 hover:underline"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate">{display}</span>
        </a>
      </div>
      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
        <PublicStatsToggle shortCode={data.shortCode} />
        <div className="flex items-center gap-1">
          <CopyButton variant="outline" size="sm" value={display} onCopied={onCopy} />
          <QrButton value={display} filename={`${data.shortCode}.png`} />
        </div>
      </div>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-2 h-6 w-48" />
      <Skeleton className="mt-2 h-3 w-72" />
    </div>
  );
}

function StatsEmptyState({ shortUrl }: { shortUrl: string }) {
  const t = useTranslations("statsEmpty");
  const { toast } = useToast();
  return (
    <div className="rounded-lg border border-dashed border-accent-300 bg-accent-50/40 p-8 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{t("title")}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{t("description")}</p>
      <div className="mt-5 flex justify-center gap-2">
        <CopyButton
          size="sm"
          variant="accent"
          label={t("shareCta")}
          value={shortUrl}
          onCopied={() => toast(t("shareCopied"), "success")}
        />
        <ShareButton url={shortUrl} title={shortUrl} />
      </div>
    </div>
  );
}
