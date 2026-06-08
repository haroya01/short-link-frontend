"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Globe2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ROTATE_MS = 5500;

type FeatureKey = "realtime" | "abtest" | "insights";

type Feature = {
  key: FeatureKey;
  icon: React.ComponentType<{ className?: string }>;
  preview: React.ComponentType;
};

/**
 * "Here's what other free shorteners don't give you" carousel — three cards because three is the
 * count at which the answer to "but what's actually different about kurl?" lands instead of
 * scrolling past. Earlier revisions ran six cards (webhooks / 2FA / abuse defense on top of the
 * three below) which read as "we have a lot" — fine if the differentiation is "many features",
 * not fine when the actual unique cut is the analytics depth on the free tier.
 *
 * <p>The three remaining surfaces are each something a typical free shortener (bit.ly / TinyURL /
 * short.io free) genuinely doesn't ship; the cut surfaces (webhooks, 2FA, Safe Browsing) are
 * absorbed into the section subhead as "+ 운영 인프라 기본 내장" so they're still on record
 * without competing for the visitor's attention.
 *
 * <p>Each preview is hand-written to mirror the chrome of the corresponding real surface
 * (border + bg + spacing scale + status pill language) so the carousel reads as "a thumbnail of
 * the real screen" rather than "an unrelated marketing illustration".
 *
 * <p><b>Mirror sources</b>:
 *
 * <ul>
 *   <li>{@code RealtimePreview} → {@code live-click-feed.tsx} (eyebrow heading + pulsing dot +
 *       {@code divide-y rounded-xl} list, same row composition: time / country pill / device /
 *       channel)</li>
 *   <li>{@code AbTestPreview} → {@code link-destinations-section.tsx} ({@code rounded-md
 *       border} per-destination card, {@code w} weight pill, country code chip, brand-green
 *       progress bar)</li>
 *   <li>{@code InsightsPreview} → {@code weekly-insights-card.tsx} (eyebrow + delta badge +
 *       4-stat grid with {@code text-lg font-semibold tabular-nums} numbers)</li>
 * </ul>
 *
 * <p>The brand-green {@code accent-*} family is the only colored token in use.
 */
const FEATURES: Feature[] = [
  { key: "realtime", icon: BarChart3, preview: RealtimePreview },
  { key: "insights", icon: Sparkles, preview: InsightsPreview },
  { key: "abtest", icon: Globe2, preview: AbTestPreview },
];

export function FeatureCarousel() {
  const t = useTranslations("home.features");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive((a) => (a + 1) % FEATURES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  const current = FEATURES[active];
  const Preview = current.preview;
  const ActiveIcon = current.icon;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        "transition-all duration-700",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
    >
      <div className="grid items-stretch gap-px overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-200 lg:grid-cols-[1fr_1.6fr]">
        <div className="flex flex-col bg-white dark:bg-slate-900">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const isActive = i === active;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setActive(i);
                  setPaused(true);
                }}
                className={cn(
                  "relative flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 px-4 text-left transition-all last:border-b-0",
                  isActive ? "bg-accent-50/60 py-3" : "py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-0 h-full w-0.5 transition-all duration-300",
                    isActive ? "bg-accent-600" : "bg-transparent",
                  )}
                />
                <span
                  className={cn(
                    "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md transition-colors",
                    isActive ? "bg-accent-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
                  )}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3
                    className={cn(
                      "text-[13px] font-semibold leading-tight transition-colors",
                      isActive ? "text-accent-800" : "text-slate-900 dark:text-slate-100",
                    )}
                  >
                    {t(`${f.key}.title`)}
                  </h3>
                  {isActive && (
                    <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                      {t(`${f.key}.desc`)}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-5 py-3">
            <div className="flex gap-1.5">
              {FEATURES.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === active ? "w-6 bg-accent-600" : "w-1.5 bg-slate-300",
                  )}
                />
              ))}
            </div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {String(active + 1).padStart(2, "0")} / 0{FEATURES.length}
            </p>
          </div>
        </div>

        <div className="relative min-h-[420px] overflow-hidden bg-white dark:bg-slate-900">
          <div key={active} className="absolute inset-0 flex animate-fade-in flex-col p-6">
            <div className="mb-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ActiveIcon className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" />
              <span className="font-mono uppercase tracking-wider">
                {t(`${current.key}.title`)}
              </span>
            </div>
            <div className="flex-1">
              <Preview />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------
 * Per-feature previews. Each mirrors the chrome of the corresponding real surface so the
 * carousel reads as a "thumbnail of the dashboard" rather than a separate marketing illustration.
 * ------------------------------------------------------------------------------------------ */

/**
 * Mirror of {@code live-click-feed.tsx} — same eyebrow heading style, pulsing emerald dot, and
 * {@code divide-y rounded-xl} feed with {@code time / country pill / device / channel} row
 * composition. Mock data is a scripted ring of 5 international events; the chrome is
 * pixel-equivalent so the user recognises this screen when they reach the real stats page.
 */
function RealtimePreview() {
  const t = useTranslations("home.features.realtime.preview");
  const events = [
    { ts: "02:14:08", country: "KR", device: "mobile", channel: "instagram.com" },
    { ts: "02:14:11", country: "JP", device: "desktop", channel: "(direct)" },
    { ts: "02:14:13", country: "KR", device: "mobile", channel: "twitter.com" },
    { ts: "02:14:17", country: "US", device: "desktop", channel: "slack.com" },
    { ts: "02:14:21", country: "KR", device: "mobile", channel: "kakaotalk.com" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-700 dark:text-accent-400">
          {t("eyebrow")}
        </h3>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            aria-hidden
          />
          <span className="font-medium text-emerald-700 dark:text-emerald-400">{t("live")}</span>
        </div>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        {events.map((e, i) => (
          <li
            key={e.ts}
            className="flex items-center gap-3 px-4 py-2.5 text-[12px]"
            style={{ animation: `tickIn 500ms ${i * 120}ms ease-out backwards` }}
          >
            <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">{e.ts}</span>
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">
              {e.country}
            </span>
            <span className="text-slate-600 dark:text-slate-300">{e.device}</span>
            <span className="truncate text-slate-500 dark:text-slate-400">· {e.channel}</span>
          </li>
        ))}
      </ul>
      <style jsx>{`
        @keyframes tickIn {
          from {
            transform: translateX(-6px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Mirror of {@code link-destinations-section.tsx} — three {@code rounded-md border} variant
 * rows with the live composition: label / {@code w 70} weight pill / country chip / hits +
 * percent in mono tabular-nums / accent progress bar / break-all destination URL underneath.
 */
function AbTestPreview() {
  const t = useTranslations("home.features.abtest.preview");
  type Variant = {
    label: string;
    url: string;
    country: { code: string; flag: string } | null;
    weight: number | null;
    hits: number;
    isControl?: boolean;
  };
  const variants: Variant[] = [
    {
      label: "variant-A",
      url: "https://example.com/landing/kr",
      country: { code: "KR", flag: "🇰🇷" },
      weight: 70,
      hits: 1247,
    },
    {
      label: "variant-B",
      url: "https://example.com/landing/jp",
      country: { code: "JP", flag: "🇯🇵" },
      weight: 30,
      hits: 312,
    },
    {
      label: t("controlLabel"),
      url: "",
      country: null,
      weight: null,
      hits: 86,
      isControl: true,
    },
  ];
  const total = variants.reduce((s, v) => s + v.hits, 0);
  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">{t("explainer")}</p>
      <div className="space-y-2">
        {variants.map((v, i) => {
          const pct = total === 0 ? 0 : (v.hits / total) * 100;
          return (
            <div
              key={v.label}
              className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
              style={{ animation: `rowIn 500ms ${i * 100}ms ease-out backwards` }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900 dark:text-slate-100">{v.label}</span>
                {v.isControl && (
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                    control
                  </span>
                )}
                {v.weight != null && (
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                    w {v.weight}
                  </span>
                )}
                {v.country && (
                  <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                    {v.country.flag} {v.country.code}
                  </span>
                )}
                <span className="ml-auto font-mono tabular-nums text-slate-700 dark:text-slate-300">
                  {v.hits.toLocaleString()} · {pct.toFixed(1)}%
                </span>
              </div>
              {v.url && (
                <code className="mt-1 block break-all font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {v.url}
                </code>
              )}
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-accent-600"
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    animation: `growBar 700ms ${i * 100}ms ease-out backwards`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        @keyframes growBar {
          from {
            width: 0;
          }
        }
        @keyframes rowIn {
          from {
            transform: translateY(4px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Mirror of {@code weekly-insights-card.tsx} — same eyebrow + delta badge composition and 4-stat
 * grid using {@code text-lg font-semibold tabular-nums} numbers with {@code text-xs} labels +
 * {@code text-[11px]} sub-captions. The brand-green emerald delta pill is identical to the real
 * card's {@code DeltaBadge} for positive deltas.
 */
function InsightsPreview() {
  const t = useTranslations("home.features.insights.preview");
  const stats = [
    { label: t("humanLabel"), value: "1,422", sub: t("humanSub") },
    { label: t("topLinkLabel"), value: "/spring", sub: t("topLinkSub"), mono: true },
    { label: t("peakLabel"), value: t("peakValue"), sub: t("peakSub") },
    { label: t("wowLabel"), value: "1,142", sub: t("wowSub") },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("heading")}</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-200">
          ↗ 24%
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
            style={{ animation: `popIn 500ms ${i * 80}ms ease-out backwards` }}
          >
            <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            <p
              className={cn(
                "mt-1 truncate text-lg font-semibold text-slate-900 dark:text-slate-100 tabular-nums",
                s.mono && "font-mono",
              )}
              title={s.value}
            >
              {s.value}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes popIn {
          from {
            transform: scale(0.96);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
