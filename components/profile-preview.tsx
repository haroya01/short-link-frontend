"use client";

import { BatteryFull, Signal, Wifi } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PublicProfileEntry, Social } from "@/types";
import { EntryList } from "@/app/[locale]/u/[username]/_components/EntryList";
import { ProfileHeader } from "@/app/[locale]/u/[username]/_components/ProfileHeader";
import { ShareRow } from "@/app/[locale]/u/[username]/_components/ShareRow";
import { THEME_TABLE } from "@/app/[locale]/u/[username]/_lib/theme";
import type { ProfileTheme } from "@/types";

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kurl.me";

/**
 * Live profile preview — uses the exact same {@link ProfileHeader} / {@link EntryList} /
 * {@link ShareRow} components the public page renders, just framed inside a phone mockup. Source
 * of truth is the editor's draft state, threaded through as a {@link PublicProfileEntry} list so
 * highlight / image / YouTube card variants render identically without duplicating logic here.
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
      <div className="relative mx-auto w-full max-w-[320px] overflow-hidden rounded-[42px] border border-slate-800/30 bg-slate-900 p-1.5 shadow-xl shadow-slate-300/40">
        {/* Dynamic-Island style notch */}
        <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-900" />
        <div
          className={`relative flex aspect-[390/844] flex-col overflow-hidden rounded-[34px] ${colors.page}`}
        >
          {/* Scroll area: status bar + the real public-profile body. Home indicator sits outside
              so it stays pinned to the phone's bottom edge even when content is short. */}
          <div className="flex-1 overflow-y-auto">
            <div
              className={`pointer-events-none sticky top-0 z-10 flex items-center justify-between px-7 pt-2 pb-1 text-[9px] font-semibold ${colors.primary}`}
            >
              <span>9:41</span>
              <div className="flex items-center gap-0.5 opacity-80">
                <Signal className="h-2.5 w-2.5" />
                <Wifi className="h-2.5 w-2.5" />
                <BatteryFull className="h-2.5 w-2.5" />
              </div>
            </div>
            <div className="px-4 pb-6 pt-2">
              <ProfileHeader
                username={displayUsername}
                bio={bio || null}
                avatarUrl={avatarUrl}
                bannerUrl={bannerUrl}
                colors={colors}
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
                    },
                    shareMore: t("share.more"),
                    copy: t("share.copy"),
                    copied: t("share.copied"),
                  }}
                />
              )}
              <p className={`mt-6 text-center text-[11px] ${colors.muted}`}>{t("madeWith")}</p>
            </div>
          </div>
          {/* Home indicator — pinned to the phone's bottom edge regardless of content height. */}
          <div className="mx-auto mb-1.5 h-1 w-24 shrink-0 rounded-full bg-slate-300/60" />
        </div>
      </div>
      <p className="text-center text-[10px] text-slate-400">kurl.me/u/{username || "..."}</p>
    </div>
  );
}
