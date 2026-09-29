"use client";

import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PublicProfile } from "@/types";
import { Link } from "@/i18n/navigation";
import { SHOWCASE_PROFILES } from "@/lib/landing-showcase-fixtures";
import { EntryList } from "@/app/[locale]/u/[username]/_components/entry-list";
import { ProfileHeader } from "@/app/[locale]/u/[username]/_components/profile-header";
import { THEME_TABLE } from "@/app/[locale]/u/[username]/_lib/theme";
import { cn } from "@/lib/utils";

/**
 * Landing-page profile showcase. Renders the real {@link ProfileHeader} + {@link EntryList} on a
 * phone-sized page (no device chrome). The inner content tree mirrors the public
 * {@code /u/[username]/page.tsx} layout — same header, same list — so the showcase shows the
 * page itself.
 *
 * Carousel is Embla — touch-swipe on mobile, drag or the prev/next buttons elsewhere. Nothing
 * moves on its own.
 */
const DEVICE_MAX_SCALE = 0.8;
const DEVICE_NATIVE_W = 428;
const DEVICE_NATIVE_H = 868;

/**
 * Fit the (fixed-size) device into the viewport with side margin so the centered slide is never
 * clipped on small screens. SSR starts at the desktop scale and corrects on mount.
 */
function useDeviceScale() {
  const [scale, setScale] = useState(DEVICE_MAX_SCALE);
  useEffect(() => {
    const compute = () => {
      const fit = (window.innerWidth - 40) / DEVICE_NATIVE_W;
      setScale(Math.max(0.5, Math.min(DEVICE_MAX_SCALE, fit)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  return scale;
}

export function ProfileShowcase() {
  const t = useTranslations("showcase");
  const scale = useDeviceScale();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    dragFree: false,
    align: "center",
    containScroll: false,
  });

  return (
    <div className="relative">
      {/* Edge fades for the peeking neighbour slides — desktop only. On mobile the centred phone
          nearly fills the width, so a fade here would clip its right edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-24 bg-gradient-to-r from-white to-transparent dark:from-slate-950 sm:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-24 bg-gradient-to-l from-white to-transparent dark:from-slate-950 sm:block"
      />

      {/* Embla's loop mode wraps slides by cloning them outside the original flex track —
          `gap` on the parent flexbox doesn't apply to the inter-slide spacing around the loop
          seam, so the last → first transition reads as "two slides glued together". Per-slide
          `mr-10` (sm:mr-14) works because the margin is on the slide itself; the clone carries
          it too, and loop wrap stays evenly spaced. The last margin is harmless visual padding
          that embla accounts for via `containScroll: false`. */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex py-2">
          {SHOWCASE_PROFILES.map((profile) => (
            <ShowcaseCard
              key={profile.username}
              profile={profile}
              demoCta={t("demoCta")}
              scale={scale}
            />
          ))}
        </div>
      </div>
      <div className="container mt-6 flex max-w-5xl justify-end gap-2">
        <button
          type="button"
          onClick={() => emblaApi?.scrollPrev()}
          aria-label={t("prev")}
          className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          aria-label={t("next")}
          className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ShowcaseCard({
  profile,
  demoCta,
  scale,
}: {
  profile: PublicProfile;
  demoCta: string;
  scale: number;
}) {
  const colors = THEME_TABLE[profile.theme ?? "default"];
  return (
    <div
      className="group relative mr-10 block shrink-0 cursor-pointer sm:mr-14"
      // Promote each slide to its own compositor layer + clip paint to the slide's box.
      // Without this, embla's translateX on the parent flex track forces every slide's
      // ContactCardEntry `filter:` and per-card `backdrop-blur` to repaint as the track
      // moves — with 9 slides (× embla loop clones) that compounds into the jank the user
      // sees. `contain: layout paint` says "nothing inside this slide affects layout/paint
      // outside it", which lets the browser keep the offscreen slides as cached layers and
      // composite them cheaply during the swipe.
      style={{ contain: "layout paint", transform: "translateZ(0)" }}
    >
      <Link
        href={`/showcase/${profile.username}`}
        className="focus-ring absolute inset-0 z-10 rounded-2xl"
        aria-label={`@${profile.username} — ${demoCta}`}
      >
        <span className="sr-only">{demoCta}</span>
      </Link>
      <div
        style={{
          width: DEVICE_NATIVE_W * scale,
          height: DEVICE_NATIVE_H * scale,
        }}
      >
        <div
          className={cn(
            "pointer-events-none overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800",
            colors.page,
          )}
          style={{
            width: DEVICE_NATIVE_W,
            height: DEVICE_NATIVE_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            WebkitMaskImage: "linear-gradient(to bottom, black 86%, transparent)",
            maskImage: "linear-gradient(to bottom, black 86%, transparent)",
            ...(colors.pageBgHex ? { backgroundColor: colors.pageBgHex } : {}),
          }}
        >
          <ProfilePreviewBody profile={profile} colors={colors} />
        </div>
      </div>
    </div>
  );
}

function ProfilePreviewBody({
  profile,
  colors,
}: {
  profile: PublicProfile;
  colors: (typeof THEME_TABLE)[keyof typeof THEME_TABLE];
}) {
  return (
    <div className="min-h-full">
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <ProfileHeader
          headingLevel="h2"
          username={profile.username}
          bio={profile.bio}
          avatarUrl={profile.avatarUrl}
          bannerUrl={profile.bannerUrl}
          colors={colors}
        />
        <EntryList
          entries={profile.entries ?? []}
          username={profile.username}
          colors={colors}
          emptyLabel=""
        />
      </div>
    </div>
  );
}
