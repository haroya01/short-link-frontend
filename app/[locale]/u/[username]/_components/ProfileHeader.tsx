import type { ThemeColors } from "../_lib/theme";

type Props = {
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  colors: ThemeColors;
};

/**
 * Banner (full-bleed, 3:1) → avatar (overlapping the banner's bottom edge when present, otherwise
 * standalone) → handle → bio. The avatar gets a small ring on the banner side so it pops
 * regardless of the banner's color.
 */
export function ProfileHeader({ username, bio, avatarUrl, bannerUrl, colors }: Props) {
  const initial = (username[0] ?? "·").toUpperCase();
  return (
    <div
      className="profile-fade flex flex-col items-center gap-3 text-center"
      style={{ "--idx": 0 } as React.CSSProperties}
    >
      {bannerUrl && (
        <div className="-mx-4 mb-2 aspect-[3/1] w-[calc(100%+2rem)] overflow-hidden sm:mx-0 sm:w-full sm:rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      {avatarUrl ? (
        <div
          className={`h-20 w-20 overflow-hidden rounded-full shadow-sm ring-4 ${
            bannerUrl ? "-mt-12 ring-white/95" : "ring-transparent"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div
          className={
            "grid h-20 w-20 place-items-center rounded-full text-2xl font-semibold shadow-sm ring-4 " +
            (bannerUrl ? "-mt-12 ring-white/95 " : "ring-transparent ") +
            `${colors.avatar} ${colors.avatarText}`
          }
        >
          {initial}
        </div>
      )}
      <p className={`text-sm font-medium ${colors.primary}`}>@{username}</p>
      {bio && <p className={`text-sm leading-relaxed ${colors.muted}`}>{bio}</p>}
    </div>
  );
}
