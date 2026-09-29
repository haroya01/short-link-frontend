import type { ThemeColors } from "../_lib/theme";
import { ProfileAvatar } from "./profile-avatar";

type Props = {
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  colors: ThemeColors;
  /** 한 페이지에 프로필이 여러 장 놓이는 곳(쇼케이스 카드·편집기 미리보기)은 h2. */
  headingLevel?: "h1" | "h2";
};

/** 문서의 머리처럼 — 표지(있으면) 한 장, 그 아래 아바타 · @이름 · 한 줄 소개를 한 줄에. */
export function ProfileHeader({ username, bio, avatarUrl, bannerUrl, colors, headingLevel = "h1" }: Props) {
  const Heading = headingLevel;
  return (
    <div className="profile-fade" style={{ "--idx": 0 } as React.CSSProperties}>
      {bannerUrl && (
        <div className="mb-6 aspect-[3/1] w-full overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerUrl}
            alt=""
            width={1200}
            height={400}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="flex items-center gap-4">
        <ProfileAvatar avatarUrl={avatarUrl} username={username} colors={colors} />
        <div className="min-w-0">
          <Heading className={`truncate text-[20px] font-semibold leading-tight tracking-headline ${colors.primary}`}>
            @{username}
          </Heading>
          {bio && <p className={`mt-1 text-[14px] leading-relaxed ${colors.muted}`}>{bio}</p>}
        </div>
      </div>
    </div>
  );
}
