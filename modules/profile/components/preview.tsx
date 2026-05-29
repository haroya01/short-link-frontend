"use client";

import { useTranslations } from "next-intl";
import type { ProfileTheme, PublicProfileEntry, Social } from "@/types";
import { EntryList } from "@/app/[locale]/u/[username]/_components/entry-list";
import { ProfileHeader } from "@/app/[locale]/u/[username]/_components/profile-header";
import { ShareRow } from "@/app/[locale]/u/[username]/_components/share-row";
import { THEME_TABLE } from "@/app/[locale]/u/[username]/_lib/theme";
import { cn } from "@/lib/utils";

type Props = {
  username: string;
  bio: string;
  theme: ProfileTheme | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  socials: Social[];
  /**
   * The same shape the public profile receives from the API. Built by the editor parent from
   * its draft state — passing the rendered shape (not raw links + flags) keeps this component a
   * dumb consumer and lets us reuse {@link EntryList} / {@link ShareRow} so the preview never
   * drifts from what visitors will actually see.
   */
  entries: PublicProfileEntry[];
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

// devices.css iPhone 14 Pro native size. Scale the whole device so the editor sidebar can fit
// it without overflowing. Inside the screen viewport (390×830) the public-profile components
// render at iPhone-viewport width — same as a real phone visit.
const DEVICE_NATIVE_W = 428;
const DEVICE_NATIVE_H = 868;
const DEVICE_SCALE = 0.75;

/**
 * Live profile preview — uses the exact same {@link ProfileHeader} / {@link EntryList} /
 * {@link ShareRow} components the public page renders, framed inside an iPhone 14 Pro shell
 * from the open-source {@code devices.css} library. The status-bar simulation (time + signal +
 * wifi + battery) is hand-drawn on top of the device-screen to nudge the preview from "design
 * mockup" toward "this is what your phone visitors actually see".
 */
export function ProfilePreview({
  username,
  bio,
  theme,
  avatarUrl,
  bannerUrl,
  socials,
  entries,
}: Props) {
  const t = useTranslations("publicProfile");
  const tEditor = useTranslations("settings.profile");
  const colors = THEME_TABLE[theme ?? "default"];
  const displayUsername = username || tEditor("previewUsernamePlaceholder");

  return (
    <div className="space-y-2">
      <p className="text-center text-[11px] font-medium text-slate-500">
        {tEditor("previewTitle")}
      </p>

      {/* Outer wrapper claims the scaled-down layout size — devices.css uses CSS transform
          which doesn't affect flow, so without this the editor sidebar would reserve the
          unscaled 428×868 footprint. */}
      <div
        className="mx-auto"
        style={{
          width: DEVICE_NATIVE_W * DEVICE_SCALE,
          height: DEVICE_NATIVE_H * DEVICE_SCALE,
        }}
      >
        <div
          className="device device-iphone-14-pro"
          // transform-origin inline (not the `origin-top-left` utility): devices.css's `.device`
          // rule overrides the utility with a centered origin, which makes scale() overflow this
          // top-left-sized wrapper box symmetrically. Pin it to top-left so the scaled device
          // exactly fills the reserved footprint.
          style={{ transform: `scale(${DEVICE_SCALE})`, transformOrigin: "top left" }}
        >
          <div className="device-frame">
            <div
              className={cn("device-screen overflow-y-auto", colors.page)}
              // Inline style (specificity 1,0,0,0) is the only thing that beats devices.css's
              // `.device .device-screen { background: #000 }` (0,2,0). Tailwind utilities
              // (0,1,0) and `:where()` resets (0,0,0) both lose. Only set for solid-color
              // themes (light/mono/default); gradient themes paint their gradient over the
              // whole screen via {@code colors.page}, hiding the #000 default anyway.
              style={
                colors.pageBgHex ? { backgroundColor: colors.pageBgHex } : undefined
              }
            >
              {/* Safe-area spacer for the Dynamic Island cutout — devices.css renders the
                  notch at screen y=10..45. The previous fake 9:41 / signal / wifi / battery
                  status-bar overlay used {@code colors.primary} as its text color, which on
                  light + mono themes (text-slate-900 / text-black) painted dark glyphs over
                  the banner area and read as "the top is grey/black even on a white theme."
                  Stripped it — the safe-area spacer below pushes content past the cutout the
                  same way the real iOS device does. */}
              <div aria-hidden className="h-10 w-full" />

              {/* Body: identical to /u/[username]/page.tsx — full-bleed banner with mask fade,
                  container with -mt-12 overlap, ProfileHeader + EntryList + ShareRow. */}
              {bannerUrl && (
                <div
                  className="aspect-[3/1] w-full overflow-hidden"
                  style={{
                    WebkitMaskImage:
                      "linear-gradient(to bottom, black 75%, transparent 100%)",
                    maskImage: "linear-gradient(to bottom, black 75%, transparent 100%)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bannerUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div
                className={cn(
                  "mx-auto w-full max-w-md px-4",
                  bannerUrl ? "-mt-12 pb-6" : "py-6",
                )}
              >
                <ProfileHeader
                  username={displayUsername}
                  bio={bio || null}
                  avatarUrl={avatarUrl}
                  bannerUrl={bannerUrl}
                  colors={colors}
                  bannerInline={false}
                />
                <EntryList
                  entries={entries}
                  username={displayUsername}
                  colors={colors}
                  emptyLabel={t("empty")}
                />
                {(socials.length > 0 || entries.length > 0) && (
                  <ShareRow
                    url={`${SITE_URL}/u/${displayUsername}`}
                    username={displayUsername}
                    colors={colors}
                    socials={socials}
                    labels={{
                      visitOn: {
                        x: t("visit.x"),
                        line: t("visit.line"),
                        threads: t("visit.threads"),
                        facebook: t("visit.facebook"),
                        kakao: t("visit.kakao"),
                        instagram: t("visit.instagram"),
                        linkedin: t("visit.linkedin"),
                      },
                      shareMore: t("share.more"),
                      copy: t("share.copy"),
                      copied: t("share.copied"),
                    }}
                  />
                )}
                <p className={cn("mt-6 text-center text-[11px]", colors.muted)}>
                  {t("madeWith")}
                </p>
              </div>
            </div>
          </div>
          <div className="device-stripe" />
          <div className="device-header" />
          <div className="device-sensors" />
          <div className="device-btns" />
          <div className="device-power" />
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-400">kurl.me/u/{username || "..."}</p>
    </div>
  );
}
