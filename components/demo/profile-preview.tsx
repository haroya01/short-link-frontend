"use client";

import {
  ArrowRight,
  ExternalLink,
  IdCard,
  MapPin,
  PlayCircle,
  Star,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { DemoProfile, DemoProfileLink } from "@/lib/demo-data";

type Props = {
  profile: DemoProfile;
};

/**
 * Lightweight silhouette of the public-profile feed for the /demo page. Renders the synthetic
 * `kurl.me/u/<handle>` page as a phone-frame preview with five mini cards — one for each
 * archetype on the real public profile (Highlight / Link / Embed / Place / Contact). Goal: a
 * visitor sees that "shortening = also gives you a one-page bio" without booting an iframe.
 *
 * <p>Phone frame keeps the content visually contained so it doesn't read like a competing
 * dashboard surface. The cards inside each follow `.profile-card-static` token contract (border
 * + radius + shadow rhythm) so the silhouette matches the real public feed visually.
 */
export function ProfilePreview({ profile }: Props) {
  const t = useTranslations("demo.profile");
  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Left rail — narrative copy + CTA */}
      <div className="flex flex-col justify-center gap-4">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-accent-200 bg-accent-50/60 px-3 py-1 text-[11px] font-medium text-accent-700">
          <IdCard className="h-3.5 w-3.5" />
          {t("handlePrefix")}
          <span className="font-mono">{profile.handle}</span>
        </div>
        <p className="text-[13px] leading-relaxed text-slate-600">
          {/* Avoid duplicating Section description — this rail goes one click deeper with
              archetype call-outs so the silhouette reads as evidence, not decoration. */}
          {t("desc")}
        </p>
        <ul className="grid grid-cols-2 gap-2 text-[12px] text-slate-600 sm:grid-cols-3">
          <Bullet icon={Star} label={t("shapes.highlight")} />
          <Bullet icon={PlayCircle} label={t("shapes.embed")} />
          <Bullet icon={MapPin} label={t("shapes.place")} />
          <Bullet icon={IdCard} label={t("shapes.contact")} />
        </ul>
        <Link
          href={`/u/${profile.handle}`}
          className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-accent-700 hover:text-accent-800"
        >
          {t("viewCta")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Right rail — phone-shaped silhouette */}
      <div className="mx-auto w-full max-w-[320px]">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 p-3 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)]">
          <div className="overflow-hidden rounded-[20px] bg-white">
            {/* URL bar */}
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-slate-200" />
              <span className="h-2 w-2 rounded-full bg-slate-200" />
              <span className="h-2 w-2 rounded-full bg-slate-200" />
              <span className="ml-2 truncate font-mono text-[10px] text-slate-500">
                {t("handlePrefix")}
                <span className="text-slate-900">{profile.handle}</span>
              </span>
            </div>

            {/* Header */}
            <div className="px-4 pb-3 pt-5 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-accent-200 bg-accent-50 text-accent-700">
                <IdCard className="h-5 w-5" />
              </div>
              <p className="mt-2 text-[14px] font-semibold leading-tight text-slate-900">
                {profile.displayName}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">{profile.tagline}</p>
            </div>

            {/* Link stack */}
            <ul className="space-y-2 px-3 pb-4">
              {profile.links.map((link, idx) => (
                <li
                  key={link.label}
                  className="profile-fade"
                  style={{ "--idx": idx + 1 } as React.CSSProperties}
                >
                  <MiniCard link={link} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bullet({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5">
      <Icon className="h-3.5 w-3.5 text-accent-700" />
      <span className="truncate font-medium text-slate-700">{label}</span>
    </span>
  );
}

/**
 * One row inside the phone-shaped silhouette. Shape varies by archetype so the stack
 * communicates "you can mix Highlight + Link + Embed + Place + Contact" without rendering the
 * full visuals (real OG / real map / real avatar). Tokens stay within the accent ramp.
 */
function MiniCard({ link }: { link: DemoProfileLink }) {
  if (link.shape === "highlight") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="relative h-16 bg-gradient-to-br from-accent-100 via-accent-50 to-white">
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-white backdrop-blur">
            <Star className="h-2.5 w-2.5 fill-current" />
            Featured
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-accent-600 text-[10px] font-bold text-white">
            h
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-semibold text-slate-900">
              {link.label}
            </span>
            <span className="block truncate font-mono text-[10px] text-slate-400">
              {link.host}
            </span>
          </span>
          <ExternalLink className="h-3 w-3 text-slate-400" />
        </div>
      </div>
    );
  }

  if (link.shape === "embed") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="relative h-14 bg-slate-900">
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-slate-900 shadow">
              <PlayCircle className="h-4 w-4 fill-current" />
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium text-slate-900">
              {link.label}
            </span>
            <span className="block truncate font-mono text-[10px] text-slate-400">
              {link.host}
            </span>
          </span>
        </div>
      </div>
    );
  }

  if (link.shape === "place") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-50 text-accent-700">
          <MapPin className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium text-slate-900">
            {link.label}
          </span>
          <span className="block truncate font-mono text-[10px] text-slate-400">{link.host}</span>
        </span>
        <ArrowRight className="h-3 w-3 text-slate-400" />
      </div>
    );
  }

  if (link.shape === "contact") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-900/80 bg-slate-900 px-3 py-2.5 text-white">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10">
          <IdCard className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium">{link.label}</span>
          <span className="block truncate font-mono text-[10px] text-white/60">{link.host}</span>
        </span>
        <ArrowRight className="h-3 w-3 text-white/60" />
      </div>
    );
  }

  // Generic LINK archetype.
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">
        {link.host.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-medium text-slate-900">{link.label}</span>
        <span className="block truncate font-mono text-[10px] text-slate-400">{link.host}</span>
      </span>
      <ExternalLink className="h-3 w-3 text-slate-400" />
    </div>
  );
}
