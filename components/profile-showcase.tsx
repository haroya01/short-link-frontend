"use client";

import { useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoplayPlugin from "embla-carousel-autoplay";
import { useTranslations } from "next-intl";
import type { PublicProfile } from "@/types";
import { Link } from "@/i18n/navigation";
import { SHOWCASE_PROFILES } from "@/lib/landing-showcase-fixtures";
import { THEME_TABLE } from "@/app/[locale]/u/[username]/_lib/theme";
import { EntryList } from "@/app/[locale]/u/[username]/_components/EntryList";
import { ProfileHeader } from "@/app/[locale]/u/[username]/_components/ProfileHeader";
import { cn } from "@/lib/utils";

/**
 * Landing-page profile showcase. Renders the real {@link ProfileHeader} + {@link EntryList}
 * inside an iPhone 14 Pro frame (devices.css). The inner content tree exactly mirrors the
 * public {@code /u/[username]/page.tsx} layout — same banner aspect ratio, same mask-image
 * fade, same {@code -mt-12} container overlap — so what visitors see in the showcase is what
 * they'd see if they viewed the real profile page on their phone.
 *
 * Carousel is Embla — touch-swipe on mobile, drag on desktop, autoplay that pauses on hover so
 * users can read a card without it sliding past.
 */
const DEVICE_SCALE = 0.8;
const DEVICE_NATIVE_W = 428;
const DEVICE_NATIVE_H = 868;

export function ProfileShowcase() {
  const t = useTranslations("showcase");
  const autoplayRef = useRef(
    AutoplayPlugin({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true }),
  );
  const [emblaRef] = useEmblaCarousel(
    { loop: true, dragFree: false, align: "center", containScroll: false },
    [autoplayRef.current],
  );

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent sm:w-24"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent sm:w-24"
      />

      {/* Embla's loop mode wraps slides by cloning them outside the original flex track —
          `gap` on the parent flexbox doesn't apply to the inter-slide spacing around the loop
          seam, so the last → first transition reads as "two slides glued together". Per-slide
          `mr-6` works because the margin is on the slide itself; the clone carries it too, and
          loop wrap stays evenly spaced. The last `mr-6` is harmless visual padding that embla
          accounts for via `containScroll: false`. */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex py-2">
          {SHOWCASE_PROFILES.map((profile) => (
            <ShowcaseCard key={profile.username} profile={profile} demoCta={t("demoCta")} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShowcaseCard({ profile, demoCta }: { profile: PublicProfile; demoCta: string }) {
  const colors = THEME_TABLE[profile.theme ?? "default"];
  return (
    <Link
      href={`/showcase/${profile.username}`}
      className="group mr-6 block shrink-0 transition-transform hover:-translate-y-1"
      aria-label={`@${profile.username} — ${demoCta}`}
      // Promote each slide to its own compositor layer + clip paint to the slide's box.
      // Without this, embla's translateX on the parent flex track forces every slide's
      // ContactCardEntry `filter:` and per-card `backdrop-blur` to repaint as the track
      // moves — with 9 slides (× embla loop clones) that compounds into the jank the user
      // sees. `contain: layout paint` says "nothing inside this slide affects layout/paint
      // outside it", which lets the browser keep the offscreen slides as cached layers and
      // composite them cheaply during the swipe.
      style={{ contain: "layout paint", transform: "translateZ(0)" }}
    >
      <div
        style={{
          width: DEVICE_NATIVE_W * DEVICE_SCALE,
          height: DEVICE_NATIVE_H * DEVICE_SCALE,
        }}
      >
        <div
          className="device device-iphone-14-pro origin-top-left"
          style={{ transform: `scale(${DEVICE_SCALE})` }}
        >
          <div className="device-frame">
            <div
              className={cn(
                "device-screen pointer-events-none overflow-y-auto",
                colors.page,
              )}
              style={
                // Inline backgroundColor beats devices.css's `.device .device-screen {
                // background: #000 }` (0,2,0). Without it light/mono themes showed black —
                // the page-color utility (0,1,0) wasn't specific enough to overturn the
                // default. Gradient themes leave pageBgHex undefined so their bg utility
                // (which paints a gradient, not a single color) keeps working unchanged.
                colors.pageBgHex
                  ? { backgroundColor: colors.pageBgHex }
                  : undefined
              }
            >
              <ProfilePreviewBody profile={profile} colors={colors} />
            </div>
          </div>
          <div className="device-stripe" />
          <div className="device-header" />
          <div className="device-sensors" />
          <div className="device-btns" />
          <div className="device-power" />
        </div>
      </div>
    </Link>
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
      <div aria-hidden className="h-12 w-full" />

      {profile.bannerUrl && (
        <div
          className="aspect-[3/1] w-full overflow-hidden"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, black 75%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, black 75%, transparent 100%)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div
        className={cn(
          "mx-auto w-full max-w-md px-4",
          profile.bannerUrl ? "-mt-12 pb-12" : "py-12",
        )}
      >
        <ProfileHeader
          username={profile.username}
          bio={profile.bio}
          avatarUrl={profile.avatarUrl}
          bannerUrl={profile.bannerUrl}
          colors={colors}
          bannerInline={false}
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
