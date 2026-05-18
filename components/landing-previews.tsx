"use client";

import { ArrowRight, IdCard, LinkIcon, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Pre-signup taster strip on the landing page. Four cards spelling out what the user actually
 * gets after shortening. Each card pairs an iconified, in-card mini-visual with one line of
 * context, so the strip stays honest about being a teaser (no fake screenshots) while still
 * telegraphing the shape of each surface.
 *
 * Visual anchor choices (one per card):
 *
 *  - stats: tiny sparkline that mirrors the 30-day trend on the real stats page
 *  - viral: stacked OG card silhouette with a live "147 clicks" pill
 *  - profile: contact-card silhouette with a "kurl.me/u/…" handle
 *  - domain: monospace go.brand.com row with a "verified" dot
 *
 * Layout follows the AGENTS.md Information archetype (essence = "알려준다"): each card is a
 * `.profile-card-static`-style surface with `rounded-2xl`, fixed padding rhythm, and the
 * brand-green accent token (no purple/blue gradients, no off-brand color blocks). Labels and
 * descriptions follow the AGENTS.md typo scale (level 5 title / level 3 desc) so the strip
 * reads at the same density as the public-profile feed.
 */
export function LandingPreviews() {
  const t = useTranslations("home");

  const items: PreviewItem[] = [
    {
      key: "stats",
      href: "/demo",
      label: t("previews.stats.title"),
      desc: t("previews.stats.desc"),
      visual: <StatsVisual />,
    },
    {
      key: "viral",
      href: "/demo",
      label: t("previews.viral.title"),
      desc: t("previews.viral.desc"),
      visual: <ViralVisual />,
    },
    {
      key: "profile",
      href: "/demo",
      label: t("previews.profile.title"),
      desc: t("previews.profile.desc"),
      visual: <ProfileVisual />,
    },
    {
      key: "domain",
      href: "/pricing",
      label: t("previews.domain.title"),
      desc: t("previews.domain.desc"),
      visual: <DomainVisual />,
    },
  ];

  return (
    <section className="border-t border-slate-100 bg-slate-50/50">
      <div className="container max-w-5xl py-12 sm:py-16">
        <p className="mb-6 text-center font-mono text-[11px] tracking-wider text-accent-700">
          {t("previews.eyebrow")}
        </p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {items.map((it) => (
            <li key={it.key}>
              <Link
                href={it.href}
                className="profile-card group flex h-full flex-col gap-3 border border-slate-200 bg-white p-4 sm:p-5"
              >
                <div className="relative h-24 w-full overflow-hidden rounded-xl bg-gradient-to-br from-accent-50 via-accent-50/40 to-white">
                  {it.visual}
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-sm font-semibold leading-tight text-slate-900">
                    {it.label}
                  </h3>
                  <p className="text-[12px] leading-snug text-slate-600">{it.desc}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-700">
                  {t("previews.see")}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

type PreviewItem = {
  key: string;
  href: string;
  label: string;
  desc: string;
  visual: React.ReactNode;
};

/**
 * Mini sparkline mirroring the stats page's 30-day daily-click chart. Hardcoded because this is
 * a teaser graphic — real stats live behind /demo. Drawn inline as SVG so it does not pull
 * recharts into the landing bundle.
 */
function StatsVisual() {
  // Smoothly rising curve with one small dip — reads as "growing engagement" at a glance.
  const points = [4, 6, 5, 9, 12, 10, 14, 18, 16, 21, 24, 22, 28, 32];
  const maxVal = Math.max(...points);
  const width = 200;
  const height = 64;
  const stepX = width / (points.length - 1);
  const toY = (v: number) => height - (v / maxVal) * (height - 8) - 4;
  const linePath = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${toY(v)}`)
    .join(" ");
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  return (
    <div className="absolute inset-0 flex items-end gap-3 px-4 pb-3 pt-3">
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-accent-700">
          30d
        </span>
        <span className="font-mono text-base font-semibold leading-none tabular-nums text-slate-900">
          1,247
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-full flex-1"
        aria-hidden
      >
        <defs>
          <linearGradient id="preview-stats-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#preview-stats-fill)" />
        <path d={linePath} fill="none" stroke="#059669" strokeWidth={1.5} />
      </svg>
    </div>
  );
}

/**
 * OG-card silhouette stack. The front card carries a tiny "live clicks" pill; the back card
 * is a faint offset shadow to telegraph "shared and re-shared". Mirrors what an actual Open
 * Graph preview looks like on KakaoTalk / X.
 */
function ViralVisual() {
  return (
    <div className="absolute inset-0 grid place-items-center px-4">
      <div className="relative h-16 w-full max-w-[180px]">
        <div className="absolute inset-x-2 top-2 h-full rounded-md border border-slate-200 bg-white/60 opacity-60" />
        <div className="absolute inset-0 flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent-600 text-white">
            <Share2 className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="h-1.5 w-20 rounded-full bg-slate-100" />
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-1.5 py-0.5 font-mono text-[9px] font-medium text-accent-700">
              <span className="relative flex h-1 w-1">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-75" />
                <span className="relative inline-flex h-1 w-1 rounded-full bg-accent-500" />
              </span>
              147 clicks
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Public-profile silhouette — avatar + handle + two stacked link rows. Reads as "one page,
 * Instagram-bio shape" without needing a real screenshot.
 */
function ProfileVisual() {
  return (
    <div className="absolute inset-0 flex items-center gap-3 px-4">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-accent-200 bg-white text-accent-700">
        <IdCard className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <span className="block font-mono text-[10px] text-slate-500">kurl.me/u/</span>
        <div className="space-y-1">
          <div className="h-1.5 w-24 rounded-full bg-accent-200" />
          <div className="h-1.5 w-16 rounded-full bg-slate-200" />
          <div className="h-1.5 w-20 rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

/**
 * Custom-domain row — monospace "go.brand.com/spring" with a verified dot. Communicates the
 * essence (branded short URL) without leaking unimplemented UI.
 */
function DomainVisual() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2 px-4">
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
        <LinkIcon className="h-3 w-3 shrink-0 text-slate-400" />
        <span className="truncate font-mono text-[11px] font-medium text-slate-900">
          go.brand.com/spring
        </span>
        <span className="ml-auto inline-flex h-4 items-center gap-1 rounded-full bg-accent-50 px-1.5 font-mono text-[9px] font-medium uppercase tracking-wider text-accent-700">
          <span className="h-1 w-1 rounded-full bg-accent-500" />
          DNS
        </span>
      </div>
      <div className="flex items-center gap-2 px-1 font-mono text-[10px] text-slate-500">
        <span>TXT</span>
        <span className="text-slate-300">·</span>
        <span>CNAME</span>
        <span className="ml-auto text-accent-700">verified</span>
      </div>
    </div>
  );
}
