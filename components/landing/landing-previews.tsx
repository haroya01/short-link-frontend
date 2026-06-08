"use client";

import { ArrowRight, IdCard, LinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Pre-signup taster strip on the landing page. Three cards spelling out what the user actually
 * gets after shortening, each linked to the surface the card describes. The "보기" target is
 * always a real, signed-out-accessible page rendered with the same components a logged-in user
 * sees — only the data (and the small sample banner on top) differs.
 *
 * Cards + targets:
 *
 *  - <b>stats</b> → {@code /demo}. The dashboard's {@code /stats/[code]} surface rendered against
 *    synthetic data. Same Header, same 5 tabs, same charts.
 *  - <b>profile</b> → {@code /showcase/dohyun.coffee}. One of the landing-carousel fixtures
 *    rendered as a full-screen public profile, identical to {@code /u/[username]}.
 *  - <b>domain</b> → {@code /pricing}. The TXT + CNAME verification flow ships under the PRO
 *    plan; pricing is the page that explains it.
 *
 * A previous version of this strip had a fourth card ("viral / OG share card") but the live
 * OG-card-with-click-counter surface promised by the visual doesn't exist as a standalone
 * page yet. Pointing it at {@code /demo} or {@code /pricing} would either lie about what's
 * there or duplicate the stats card; per the "100% mirror" rule (cards point to real pages)
 * we dropped it until that surface ships.
 *
 * Layout follows the AGENTS.md Information archetype: each card is a
 * {@code .profile-card-static}-style surface with {@code rounded-2xl}, fixed padding rhythm,
 * and the brand-green accent token. Labels and descriptions follow the AGENTS.md typo scale
 * (level 5 title / level 3 desc) so the strip reads at the same density as the public-profile
 * feed below.
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
      // Profile card lands on `min.links` — the pure Linktree-style sample (LINK entries only,
      // light theme). The previous target was `dohyun.coffee`, a fully tricked-out café
      // persona with PLACE / CONTACT_CARD / GALLERY — beautiful but not the entry-level "all
      // my links in one tap" use case the landing visitor expects to see.
      key: "profile",
      href: "/showcase/min.links",
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
    <section className="relative isolate overflow-hidden bg-slate-50/60 dark:bg-slate-900/40">
      <div className="container max-w-5xl py-16 sm:py-20">
        <div className="mb-10 flex items-center gap-3">
          <span aria-hidden className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700 dark:text-accent-400">
            {t("previews.eyebrow")}
          </p>
          <span aria-hidden className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>
        {/*
         * Asymmetric grid — featured card spans 2 columns on desktop, the remaining two stack to
         * the right. Per AGENTS.md 1-primary rule we keep the same archetype (Information) but
         * grid-break the first card so the page stops reading as "three identical tiles" which
         * was the largest "AI slop" tell in the original layout. On mobile the cards collapse
         * to a single stack so nothing fights for width.
         */}
        <ul className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3 lg:grid-rows-2">
          {items.map((it, i) => (
            <li
              key={it.key}
              className={
                i === 0
                  ? "profile-fade lg:col-span-2 lg:row-span-2"
                  : "profile-fade"
              }
              style={{ ["--idx" as string]: i } as React.CSSProperties}
            >
              <Link
                href={it.href}
                className={
                  "profile-card card-highlight group flex h-full flex-col gap-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6"
                }
              >
                <div
                  className={
                    "relative w-full overflow-hidden rounded-xl border border-accent-100 bg-gradient-to-br from-accent-50 via-white to-white " +
                    (i === 0 ? "h-44 sm:h-56" : "h-24 sm:h-28")
                  }
                >
                  {it.visual}
                </div>
                <div className="flex-1 space-y-1.5">
                  <h3
                    className={
                      "leading-tight tracking-headline text-slate-900 dark:text-slate-100 " +
                      (i === 0
                        ? "text-lg font-semibold sm:text-xl"
                        : "text-sm font-semibold")
                    }
                  >
                    {it.label}
                  </h3>
                  <p className="text-[12px] leading-snug text-slate-600 dark:text-slate-300 sm:text-[13px]">
                    {it.desc}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-700 dark:text-accent-400">
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
        <span className="font-mono text-[10px] uppercase tracking-wider text-accent-700 dark:text-accent-400">
          30d
        </span>
        <span className="font-mono text-base font-semibold leading-none tabular-nums text-slate-900 dark:text-slate-100">
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
 * Public-profile silhouette — avatar + handle + two stacked link rows. Reads as "one page,
 * Instagram-bio shape" without needing a real screenshot.
 */
function ProfileVisual() {
  return (
    <div className="absolute inset-0 flex items-center gap-3 px-4">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-accent-200 bg-white dark:bg-slate-900 text-accent-700 dark:text-accent-400">
        <IdCard className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <span className="block font-mono text-[10px] text-slate-500 dark:text-slate-400">kurl.me/u/</span>
        <div className="space-y-1">
          <div className="h-1.5 w-24 rounded-full bg-accent-200" />
          <div className="h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-1.5 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

/**
 * Custom-domain row — monospace branded URL anchored by a small brand-green status dot, with
 * the DNS-record provenance ("DNS · TXT · CNAME ... verified") spelled out underneath in
 * muted mono. Communicates the essence (branded short URL + auto-verified) without leaking
 * unimplemented UI.
 *
 * Layout rationale — the earlier two-column row (URL on the left, "DNS" pill on the right)
 * could not survive the laptop-1280 4-col grid, where the card collapses to ~210 px and the
 * pill + URL fight for the same axis. At that width the URL gets clipped to "go.brand…"
 * (hiding the entire value prop) or, in unstyled fallback, the pill stack-wraps its letters
 * into D / N / S. Solution: drop the competing pill, give the URL the whole row with a small
 * status dot in its place, and demote the record metadata to a second, lower-density line.
 * Every span in the meta row gets `whitespace-nowrap` + `shrink-0` so no individual token can
 * vertical-stack even if a wider Korean font fallback pushes the line past its container.
 */
function DomainVisual() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2 px-4">
      <div className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5">
        <LinkIcon className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-medium text-slate-900 dark:text-slate-100">
          go.brand.com/spring
        </span>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" aria-hidden />
      </div>
      <div className="flex min-w-0 items-center gap-1.5 px-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
        <span className="shrink-0 whitespace-nowrap uppercase tracking-wider text-accent-700 dark:text-accent-400">
          DNS
        </span>
        <span className="shrink-0 text-slate-300">·</span>
        <span className="shrink-0 whitespace-nowrap">TXT</span>
        <span className="shrink-0 text-slate-300">·</span>
        <span className="shrink-0 whitespace-nowrap">CNAME</span>
        <span className="ml-auto shrink-0 whitespace-nowrap text-accent-700 dark:text-accent-400">verified</span>
      </div>
    </div>
  );
}
