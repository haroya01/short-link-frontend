"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Calendar, MapPin, Play, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SHOWCASE_PROFILES, type ShowcaseProfile, type ShowcaseEntry } from "@/lib/landing-showcase-fixtures";
import { THEME_TABLE } from "@/app/[locale]/u/[username]/_lib/theme";
import { cn } from "@/lib/utils";

/**
 * Landing-page profile showcase. Renders a horizontally-scrolling marquee of mini phone-frame
 * profile previews so a non-logged-in visitor sees the product's range (themes / archetype mix /
 * entry types) before they've shortened a single URL. The cards are fixture data (see
 * landing-showcase-fixtures.ts) so a backend outage never affects the landing.
 *
 * Auto-scrolls left continuously; pauses on hover/touch. Each card links to /demo so the
 * "click → see full profile" hand-off lands somewhere persuasive without leaking real user
 * profiles into marketing.
 */
const ROW_DURATION_SECONDS = 60;

export function ProfileShowcase() {
  const t = useTranslations("showcase");
  // Duplicate the list so the marquee can scroll infinitely (translate from 0 to -50%).
  const tiles = [...SHOWCASE_PROFILES, ...SHOWCASE_PROFILES];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 },
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Soft edge fades — the marquee bleeds visually instead of clipping mid-card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent sm:w-24"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent sm:w-24"
      />

      <div
        className={cn(
          "showcase-marquee flex w-max gap-4 py-2 transition-opacity duration-700",
          visible ? "opacity-100" : "opacity-0",
        )}
        style={{ animationDuration: `${ROW_DURATION_SECONDS}s` }}
      >
        {tiles.map((profile, i) => (
          <ShowcaseCard key={`${profile.handle}-${i}`} profile={profile} demoCta={t("demoCta")} />
        ))}
      </div>

      <style jsx>{`
        .showcase-marquee {
          animation-name: showcase-scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .showcase-marquee:hover {
          animation-play-state: paused;
        }
        @keyframes showcase-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .showcase-marquee {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

function ShowcaseCard({ profile, demoCta }: { profile: ShowcaseProfile; demoCta: string }) {
  const colors = THEME_TABLE[profile.theme];
  return (
    <Link
      href="/demo"
      className="group relative shrink-0 transition-transform hover:-translate-y-0.5"
      aria-label={`${profile.displayName} — ${demoCta}`}
    >
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-lg shadow-slate-900/5 group-hover:shadow-xl group-hover:shadow-slate-900/10">
        <div className={cn("w-[280px] sm:w-[300px]", colors.page)}>
          <div className="h-20" style={{ background: profile.bannerColor }} />
          <div className="px-5 pb-5">
            <div className="-mt-7 flex items-end gap-3">
              <div
                className={cn(
                  "grid h-14 w-14 place-items-center rounded-full text-xl font-semibold ring-4 ring-white",
                  colors.avatar,
                  colors.avatarText,
                )}
              >
                {profile.avatarSeed}
              </div>
            </div>
            <div className="mt-3">
              <p className={cn("text-sm font-semibold", colors.primary)}>{profile.displayName}</p>
              <p className={cn("text-[11px]", colors.muted)}>@{profile.handle}</p>
              <p className={cn("mt-2 text-xs leading-relaxed", colors.muted)}>{profile.bio}</p>
            </div>
            <div className="mt-4 space-y-2">
              {profile.entries.slice(0, 3).map((entry, i) => (
                <MiniEntry key={i} entry={entry} colors={colors} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function MiniEntry({
  entry,
  colors,
}: {
  entry: ShowcaseEntry;
  colors: (typeof THEME_TABLE)[keyof typeof THEME_TABLE];
}) {
  if (entry.kind === "link") {
    return (
      <div
        className={cn(
          "flex items-center justify-between rounded-md border bg-white/60 px-3 py-2 text-xs",
          colors.cardBorder,
          colors.primary,
        )}
      >
        <span className="truncate">{entry.label}</span>
        <ArrowRight className="h-3 w-3 shrink-0" />
      </div>
    );
  }
  if (entry.kind === "highlight") {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium",
          colors.ctaPrimary,
        )}
      >
        {entry.label}
        <ArrowRight className="h-3 w-3" />
      </div>
    );
  }
  if (entry.kind === "place") {
    return (
      <div
        className={cn("overflow-hidden rounded-md border", colors.cardBorder)}
        style={{ background: "white" }}
      >
        <div className="h-16 w-full" style={{ background: entry.coverColor }} />
        <div className="px-2.5 py-1.5">
          <p className={cn("text-[11px] font-medium", colors.primary)}>{entry.name}</p>
          <div className={cn("mt-0.5 flex items-center gap-1 text-[10px]", colors.muted)}>
            <MapPin className="h-2.5 w-2.5" />
            <span className="truncate">{entry.address}</span>
          </div>
        </div>
      </div>
    );
  }
  if (entry.kind === "product") {
    return (
      <div
        className={cn("flex items-center gap-2.5 rounded-md border bg-white px-2 py-2", colors.cardBorder)}
      >
        <div className="h-10 w-10 shrink-0 rounded" style={{ background: entry.coverColor }} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-[11px] font-medium", colors.primary)}>{entry.title}</p>
          <p className={cn("text-[10px]", colors.muted)}>{entry.price}</p>
        </div>
        <ShoppingBag className={cn("h-3 w-3 shrink-0", colors.muted)} />
      </div>
    );
  }
  if (entry.kind === "event") {
    return (
      <div className={cn("rounded-md border bg-white/80 px-2.5 py-2", colors.cardBorder)}>
        <div className="flex items-center gap-1.5">
          <Calendar className={cn("h-3 w-3 shrink-0", colors.muted)} />
          <p className={cn("truncate text-[11px] font-medium", colors.primary)}>{entry.title}</p>
        </div>
        <p className={cn("mt-0.5 pl-4 text-[10px]", colors.muted)}>
          {entry.date} · {entry.location}
        </p>
      </div>
    );
  }
  if (entry.kind === "embed") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border bg-gradient-to-br from-slate-900 to-slate-800 px-2.5 py-2.5 text-white",
          colors.cardBorder,
        )}
      >
        <Play className="h-3.5 w-3.5 fill-white" />
        <p className="truncate text-[11px] font-medium">{entry.title}</p>
      </div>
    );
  }
  if (entry.kind === "gallery") {
    return (
      <div className="grid grid-cols-3 gap-1">
        {entry.colors.map((c, i) => (
          <div
            key={i}
            className="aspect-square rounded"
            style={{ background: c }}
          />
        ))}
      </div>
    );
  }
  if (entry.kind === "contact") {
    return (
      <div
        className={cn(
          "rounded-md border bg-gradient-to-br from-slate-900 to-slate-700 px-3 py-2.5 text-white",
          colors.cardBorder,
        )}
      >
        <p className="text-[10px] uppercase tracking-wider opacity-70">vCard</p>
        <p className="mt-0.5 text-[11px] font-semibold">{entry.title}</p>
        <p className="text-[10px] opacity-80">{entry.company}</p>
      </div>
    );
  }
  if (entry.kind === "bio") {
    return <p className={cn("text-xs", colors.muted)}>{entry.text}</p>;
  }
  return null;
}
