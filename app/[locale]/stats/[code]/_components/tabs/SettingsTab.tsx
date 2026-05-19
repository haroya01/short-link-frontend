"use client";

import { Lock, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { LinkDestinationsSection } from "@/components/link-destinations-section";
import { LinkWebhooksSection } from "@/components/link-webhooks-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Link } from "@/i18n/navigation";
import type { LinkStats } from "@/types";

export function SettingsTab({
  data,
  onTick,
  demo = false,
}: {
  data: LinkStats;
  onTick: () => void;
  /**
   * The real settings tab mounts {@link LinkDestinationsSection} + {@link LinkWebhooksSection},
   * both of which immediately fetch their own state from {@code /api/v1/links/{code}/...}. On
   * /demo there's no session, so we render visual mirrors of the same two sections — same
   * markup, disabled inputs, seeded sample rows — instead of letting the real components
   * silently fail. The 100% mirror principle: visitors see what they'd be configuring after
   * sign-up, not a "come back later" placeholder.
   */
  demo?: boolean;
}) {
  if (demo) {
    return <DemoSettingsBody />;
  }
  return (
    <div className="space-y-5">
      <LinkDestinationsSection
        shortCode={data.shortCode}
        destinationClicks={data.destinationClicks}
        onChanged={onTick}
      />
      <LinkWebhooksSection shortCode={data.shortCode} />
    </div>
  );
}

/**
 * The /demo Settings surface. Combines a slim top banner (one CTA to /login) with the two
 * section mirrors below. The mirrors render the same chrome the dashboard does — A/B
 * destinations and webhooks — only with disabled controls and seeded rows so visitors can read
 * the actual feature shape without an account. Any click on a disabled control fires a toast
 * pointing at sign-up rather than silently doing nothing.
 */
function DemoSettingsBody() {
  return (
    <div className="space-y-5">
      <DemoSettingsBanner />
      <DemoLinkDestinationsPreview />
      <DemoLinkWebhooksPreview />
    </div>
  );
}

function DemoSettingsBanner() {
  const t = useTranslations("demo.settingsNotice");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent-200 bg-accent-50/60 px-4 py-3 text-[12px]">
      <div className="flex items-center gap-2.5 text-accent-800">
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        <div>
          <p className="font-medium">{t("title")}</p>
          <p className="mt-0.5 text-accent-700/90">{t("desc")}</p>
        </div>
      </div>
      <Link
        href="/login"
        className="inline-flex items-center gap-1 rounded-md border border-accent-300 bg-white px-3 py-1.5 font-medium text-accent-800 hover:bg-accent-50"
      >
        {t("cta")}
      </Link>
    </div>
  );
}

/**
 * Sample A/B destinations the demo renders into the disabled mirror. Numbers are chosen so the
 * percentages don't tie — A wins narrowly so visitors see what "A beat B" looks like in the
 * real owner-facing rail. weight stays at 50/50 because that's the most common starting split.
 */
const DEMO_DESTINATIONS = [
  {
    id: 101,
    label: "variant-A",
    url: "https://shop.haruatelier.com/spring-drop?variant=A",
    weight: 50,
    enabled: true,
    countryCode: null as string | null,
    count: 612,
  },
  {
    id: 102,
    label: "variant-B",
    url: "https://shop.haruatelier.com/spring-drop?variant=B",
    weight: 50,
    enabled: true,
    countryCode: null as string | null,
    count: 588,
  },
  {
    id: 103,
    label: "jp-landing",
    url: "https://shop.haruatelier.com/jp/spring-drop",
    weight: 100,
    enabled: true,
    countryCode: "JP" as string | null,
    count: 124,
  },
];

function DemoLinkDestinationsPreview() {
  const t = useTranslations("stats.destinations");
  const tDemo = useTranslations("demo.settingsDemo");
  const { toast } = useToast();
  const lockMessage = tDemo("lockedToast");
  const lock = () => toast(lockMessage, "default");
  const total = DEMO_DESTINATIONS.reduce((s, d) => s + d.count, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="mb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold tracking-headline text-slate-900">
              {t("title")}
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{t("description")}</p>
          </div>
          <DemoBadge />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          lock();
        }}
        className="grid gap-2 sm:grid-cols-[1fr_100px_120px_120px_auto]"
      >
        <Input
          type="url"
          value=""
          readOnly
          placeholder="https://variant-a.example.com"
          disabled
          onClick={lock}
        />
        <Input
          type="number"
          value={50}
          readOnly
          min={1}
          max={100}
          placeholder={t("weight")}
          disabled
          onClick={lock}
        />
        <Input
          type="text"
          value=""
          readOnly
          placeholder={t("labelPlaceholder")}
          maxLength={40}
          disabled
          onClick={lock}
        />
        <select
          value=""
          onChange={() => {}}
          disabled
          className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-50"
          aria-label={t("countryLabel")}
          onClick={lock}
        >
          <option value="">{t("countryAny")}</option>
        </select>
        <Button type="submit" size="sm" variant="accent" disabled>
          {t("add")}
        </Button>
      </form>

      <div className="mt-4 space-y-2">
        {DEMO_DESTINATIONS.map((d) => (
          <DemoDestinationRow key={d.id} d={d} total={total} onLock={lock} />
        ))}
      </div>
    </section>
  );
}

function DemoDestinationRow({
  d,
  total,
  onLock,
}: {
  d: (typeof DEMO_DESTINATIONS)[number];
  total: number;
  onLock: () => void;
}) {
  const t = useTranslations("stats.destinations");
  const pct = total === 0 ? 0 : (d.count / total) * 100;
  const flag = d.countryCode === "JP" ? "🇯🇵" : d.countryCode === "KR" ? "🇰🇷" : "🇺🇸";
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-900">{d.label}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
          w {d.weight}
        </span>
        {d.countryCode && (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
            {flag} {d.countryCode}
          </span>
        )}
        <span className="ml-auto font-mono tabular-nums text-slate-700">
          {d.count} · {pct.toFixed(1)}%
        </span>
      </div>
      <code className="mt-1 block break-all font-mono text-[11px] text-slate-500" title={d.url}>
        {d.url}
      </code>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded bg-slate-100">
        <div className="h-full bg-accent-600" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="range"
          min={1}
          max={100}
          value={d.weight}
          readOnly
          disabled
          onClick={onLock}
          className="h-1 flex-1 cursor-not-allowed accent-slate-900 opacity-50"
          aria-label={t("weight")}
        />
        <Button type="button" size="sm" variant="ghost" disabled onClick={onLock}>
          {t("disable")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-red-600"
          disabled
          onClick={onLock}
        >
          {t("delete")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Sample webhook the demo renders. The URL points at a Slack-incoming-webhook lookalike host
 * so visitors recognise the shape; the secret is the bcrypt-ish "shape" of what's actually
 * issued (kurl_whk_…) without being a usable credential. lastCalledAt + 2xx status are seeded
 * so the status pill renders the success path; the badges show batch + sample + quota wired so
 * the demo communicates every config knob in one row.
 */
const DEMO_WEBHOOK = {
  id: 201,
  name: "slack-#alerts",
  url: "https://hooks.slack.com/services/T01ABC/B02XYZ/demo-token",
  enabled: true,
  lastStatusCode: 200,
  lastCalledAt: "2026-05-10T20:14:32",
  consecutiveFailures: 0,
  lastError: null as string | null,
  includeBots: false,
  sampleRate: 50,
  batchEnabled: true,
  dailyQuota: 5000,
  autoDisabledReason: null as string | null,
};

function DemoLinkWebhooksPreview() {
  const t = useTranslations("stats.webhooks");
  const tDemo = useTranslations("demo.settingsDemo");
  const { toast } = useToast();
  const lockMessage = tDemo("lockedToast");
  const lock = () => toast(lockMessage, "default");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="mb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold tracking-headline text-slate-900">
              {t("title")}
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{t("description")}</p>
          </div>
          <DemoBadge />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          lock();
        }}
        className="grid gap-2 sm:grid-cols-[1fr_180px_auto]"
      >
        <Input
          type="url"
          value=""
          readOnly
          placeholder="https://hooks.slack.com/services/..."
          disabled
          onClick={lock}
        />
        <Input
          type="text"
          value=""
          readOnly
          placeholder={t("namePlaceholder")}
          maxLength={100}
          disabled
          onClick={lock}
        />
        <Button type="submit" size="sm" variant="accent" disabled>
          {t("register")}
        </Button>
      </form>

      <div className="mt-4 space-y-2">
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <span className="mr-2 font-medium text-slate-900">{DEMO_WEBHOOK.name}</span>
              <code
                className="break-all font-mono text-[11px] text-slate-600"
                title={DEMO_WEBHOOK.url}
              >
                {DEMO_WEBHOOK.url}
              </code>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                  {DEMO_WEBHOOK.lastStatusCode}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                  {t("badgeSkipBots")}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                  {t("badgeSample", { rate: DEMO_WEBHOOK.sampleRate })}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                  {t("badgeBatch")}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                  {t("badgeQuota", { n: DEMO_WEBHOOK.dailyQuota })}
                </span>
                <span>
                  {t("lastCalled")}: {DEMO_WEBHOOK.lastCalledAt.replace("T", " ")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button type="button" size="sm" variant="ghost" disabled onClick={lock}>
                {t("options")}
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled onClick={lock}>
                {t("disable")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-red-600"
                disabled
                onClick={lock}
              >
                {t("delete")}
              </Button>
            </div>
          </div>
        </div>

        {/* Payload preview — the dashboard doesn't ship this inline (owners read it from the
            docs), but on /demo it's the cheapest way to communicate what the webhook actually
            sends. Same chrome the dashboard uses for the one-time-secret reveal banner. */}
        <details className="rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs">
          <summary className="cursor-pointer select-none font-medium text-slate-700">
            {tDemo("payloadPreview")}
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-700">
{`POST https://hooks.slack.com/services/T01ABC/B02XYZ/demo-token
Content-Type: application/json
X-Kurl-Signature: sha256=8b1a9953c4611296a827abf8c47804d7

{
  "event": "click",
  "shortCode": "demo01",
  "occurredAt": "2026-05-10T20:14:32Z",
  "country": "KR",
  "city": "Seoul",
  "device": "mobile",
  "referrerHost": "instagram.com",
  "utm": { "source": "instagram", "medium": "social", "campaign": "spring-drop" },
  "isBot": false
}`}
          </pre>
        </details>
      </div>
    </section>
  );
}

function DemoBadge() {
  const tDemo = useTranslations("demo.settingsDemo");
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600">
      <Lock className="h-3 w-3" />
      {tDemo("badge")}
    </span>
  );
}
