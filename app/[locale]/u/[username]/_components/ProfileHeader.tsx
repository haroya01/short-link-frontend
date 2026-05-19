import type { ThemeColors } from "../_lib/theme";

type Props = {
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  colors: ThemeColors;
  /**
   * Render the banner inside this header. The public page sets this to {@code false} and renders
   * a separate full-bleed banner before the container so it can reach the screen edges + fade
   * into the page background. The phone-preview keeps {@code true} so the banner stays inside
   * the framed preview.
   */
  bannerInline?: boolean;
};

/**
 * Banner (3:1) → avatar (overlapping the banner's bottom edge when present, otherwise standalone)
 * → handle → bio. The avatar gets a small ring on the banner side so it pops regardless of the
 * banner's color. When {@code bannerInline} is false the banner is suppressed here — the avatar
 * still pulls up to overlap an external banner via {@code -mt-12}, controlled by {@code bannerUrl}
 * being truthy.
 */
export function ProfileHeader({
  username,
  bio,
  avatarUrl,
  bannerUrl,
  colors,
  bannerInline = true,
}: Props) {
  const initial = (username[0] ?? "·").toUpperCase();
  return (
    <div
      className="profile-fade flex flex-col items-center gap-3 text-center"
      style={{ "--idx": 0 } as React.CSSProperties}
    >
      {bannerUrl && bannerInline && (
        <div className="-mx-4 mb-2 aspect-[3/1] w-[calc(100%+2rem)] overflow-hidden sm:mx-0 sm:w-full sm:rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      {avatarUrl ? (
        <div
          className={`h-24 w-24 overflow-hidden rounded-full shadow-sm ring-4 ${
            bannerUrl ? "-mt-14 ring-white/95" : "ring-transparent"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div
          className={
            "grid h-24 w-24 place-items-center rounded-full text-[28px] font-semibold shadow-sm ring-4 " +
            (bannerUrl ? "-mt-14 ring-white/95 " : "ring-transparent ") +
            `${colors.avatar} ${colors.avatarText}`
          }
        >
          {initial}
        </div>
      )}
      {/* Handle scale unified with dashboard / stats pages — 18 px semibold with tracking-headline
          is the brand voice for the page's primary identifier. Previously 14 px regular which
          read as caption-weight on a Linktree-equivalent landing page. */}
      <p
        className={`text-[18px] font-semibold leading-tight tracking-headline ${colors.primary}`}
      >
        @{username}
      </p>
      {bio && (
        <p
          className={`max-w-[28ch] text-[15px] leading-relaxed ${colors.muted}`}
        >
          {bio}
        </p>
      )}
    </div>
  );
}
