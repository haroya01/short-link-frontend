"use client";

import {
  ArrowUpRight,
  MessageCircle,
  MessagesSquare,
  Send,
  Share2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { DemoShareChannel, DemoSharedLink } from "@/lib/demo-data";
import { cn, formatNumber } from "@/lib/utils";

type Props = {
  shares: DemoSharedLink[];
};

/**
 * Viral / share-card section of the public /demo page. Renders the synthetic share links from
 * `demo-data` as OG-style unfurl silhouettes — short slug + title + description + host on one
 * column, channel badge + live click ping + count on the other. The shape mirrors what a kurl
 * link looks like when pasted into KakaoTalk / X / Slack, so visitors recognize the same
 * unfurl behavior on the dashboard side.
 *
 * <p>Built as a `.profile-card-static` wrapper around each card (per AGENTS.md — no inline
 * `rounded-lg` shadows). Channel chips use the accent ramp + neutral slate, never off-brand
 * blues/purples. The ping pulse only animates on `hot` shares so the eye is drawn to the live
 * one instead of all three competing.
 */
export function ViralPreview({ shares }: Props) {
  const t = useTranslations("demo.viral");
  // Top click count drives the leader-highlight on the click number — the same `accent-700 vs
  // slate-900` cue we use elsewhere on /demo (CountryTable / BreakdownList). Without it all
  // three cards' counts read at equal weight even though the first is the "hot" share.
  const topClicks = shares.reduce((m, s) => Math.max(m, s.clicks), 0);
  return (
    <ul className="grid gap-3 sm:gap-4 lg:grid-cols-3">
      {shares.map((s, idx) => {
        const isLeader = s.clicks === topClicks && topClicks > 0;
        return (
          <li key={s.slug} className="profile-fade" style={{ "--idx": idx } as React.CSSProperties}>
            <article
              className={cn(
                "profile-card-static h-full overflow-hidden bg-white",
                isLeader ? "border-accent-200 ring-1 ring-accent-100" : "border-slate-200",
              )}
            >
              <header className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                <span className="font-mono text-[11px] font-medium text-slate-500">
                  kurl.me/
                </span>
                <span className="font-mono text-[11px] font-semibold text-accent-700">
                  {s.slug}
                </span>
                <ChannelBadge channel={s.channel} t={t} />
              </header>

              <div className="px-4 py-3.5">
                <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-slate-900">
                  {s.ogTitle}
                </p>
                <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-slate-600">
                  {s.ogDescription}
                </p>
                <p className="mt-2 truncate font-mono text-[11px] text-slate-400">{s.host}</p>
              </div>

              <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <span className="relative flex h-1.5 w-1.5">
                    {s.hot && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-75" />
                    )}
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-500" />
                  </span>
                  {t("ping")}
                </span>
                <span className="inline-flex items-baseline gap-1 font-mono tabular-nums">
                  <span
                    className={cn(
                      "text-[15px] font-semibold",
                      isLeader ? "text-accent-700" : "text-slate-900",
                    )}
                  >
                    {formatNumber(s.clicks)}
                  </span>
                  <span className="text-[11px] text-slate-500">{t("clicksLabel")}</span>
                </span>
              </footer>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Small channel chip — icon + label. Channel icons stay grayscale + accent-700 so the strip
 * doesn't pull in off-brand color blocks. lucide picks: X gets ArrowUpRight (X-like glyph),
 * KakaoTalk gets MessageCircle (their bubble), Slack gets MessagesSquare (multi-channel),
 * Instagram gets Send (DM share), direct copy gets Share2 (generic share).
 */
function ChannelBadge({
  channel,
  t,
}: {
  channel: DemoShareChannel;
  t: (key: string) => string;
}) {
  const map: Record<DemoShareChannel, { Icon: React.ComponentType<{ className?: string }>; label: string }> = {
    x: { Icon: ArrowUpRight, label: t("channels.x") },
    kakao: { Icon: MessageCircle, label: t("channels.kakao") },
    slack: { Icon: MessagesSquare, label: t("channels.slack") },
    instagram: { Icon: Send, label: t("channels.instagram") },
    direct: { Icon: Share2, label: t("channels.direct") },
  };
  const { Icon, label } = map[channel];
  return (
    <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-accent-200 bg-accent-50/70 px-2 py-0.5 text-[10px] font-medium text-accent-700">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
