import type { ThemeColors } from "../_lib/theme";

type Props = {
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  colors: ThemeColors;
};

/** Avatar + handle + bio block at the top of the public profile. */
export function ProfileHeader({ username, bio, avatarUrl, colors }: Props) {
  const initial = (username[0] ?? "·").toUpperCase();
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {avatarUrl ? (
        <div className="h-20 w-20 overflow-hidden rounded-full shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div
          className={`grid h-20 w-20 place-items-center rounded-full text-2xl font-semibold shadow-sm ${colors.avatar} ${colors.avatarText}`}
        >
          {initial}
        </div>
      )}
      <p className={`text-sm font-medium ${colors.primary}`}>@{username}</p>
      {bio && <p className={`text-sm leading-relaxed ${colors.muted}`}>{bio}</p>}
    </div>
  );
}
