"use client";

import { Check, Loader2 } from "lucide-react";
import type { useTranslations } from "next-intl";
import { AvatarPicker } from "../avatar-picker";
import { BannerPicker } from "../banner-picker";
import { QrButton } from "../qr-button";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type { MyProfile, ProfileTheme } from "@/types";
import { PublicUrlPill } from "./PublicUrlPill";

/**
 * Picker preview classes — each theme renders as a mini-card showing the actual page bg + a
 * sample link card inside. Kept self-contained (not imported from THEME_TABLE) so the picker
 * is visually accurate without dragging in /u page's full color tokens; the small duplication
 * is the price of decoupling.
 */
const THEMES: { id: ProfileTheme; label: string; page: string; card: string }[] = [
  { id: "light", label: "Light", page: "bg-slate-50", card: "bg-white border border-slate-200" },
  { id: "dark", label: "Dark", page: "bg-slate-950", card: "bg-slate-900 border border-slate-800" },
  {
    id: "accent",
    label: "Accent",
    page: "bg-gradient-to-b from-accent-50 to-white",
    card: "bg-white border border-accent-200",
  },
  {
    id: "sunset",
    label: "Sunset",
    page: "bg-gradient-to-b from-orange-100 via-rose-50 to-amber-50",
    card: "bg-white/90 border border-rose-200",
  },
  {
    id: "ocean",
    label: "Ocean",
    page: "bg-gradient-to-b from-sky-100 via-cyan-50 to-blue-50",
    card: "bg-white/90 border border-sky-200",
  },
  {
    id: "forest",
    label: "Forest",
    page: "bg-gradient-to-b from-emerald-100 via-green-50 to-teal-50",
    card: "bg-white/90 border border-emerald-200",
  },
  { id: "mono", label: "Mono", page: "bg-white", card: "bg-white border-2 border-black" },
  {
    id: "neon",
    label: "Neon",
    page: "bg-slate-950",
    card: "bg-slate-900/80 border border-fuchsia-500/40",
  },
  {
    id: "aurora",
    label: "Aurora",
    page: "theme-aurora-anim",
    card: "bg-white/85 backdrop-blur-sm border border-violet-200",
  },
];

type Props = {
  profile: MyProfile | null;
  username: string;
  bio: string;
  theme: ProfileTheme | null;
  savingProfile: boolean;
  autoSaveStatus: "idle" | "saving" | "saved";
  onUsernameChange: (next: string) => void;
  onBioChange: (next: string) => void;
  onThemeChange: (next: ProfileTheme | null) => void;
  onAvatarChange: (avatarUrl: string | null) => void;
  onBannerChange: (bannerUrl: string | null) => void;
  onSave: () => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * Avatar + identity + theme + save controls. Pure render — all state lives in the parent
 * {@code ProfileSection}. Bio and theme auto-save on debounce; username keeps an explicit Save
 * button because changing it costs the user their old URL (30d grace then expires).
 */
export function ProfileMetaForm({
  profile,
  username,
  bio,
  theme,
  savingProfile,
  autoSaveStatus,
  onUsernameChange,
  onBioChange,
  onThemeChange,
  onAvatarChange,
  onBannerChange,
  onSave,
  t,
}: Props) {
  const usernameUnchanged =
    profile?.username && username.trim().toLowerCase() === profile.username.toLowerCase();

  return (
    <div className="space-y-3">
      <BannerPicker currentUrl={profile?.bannerUrl ?? null} onChange={onBannerChange} />
      <AvatarPicker
        currentUrl={profile?.avatarUrl ?? null}
        initialChar={(username[0] ?? "·").toUpperCase()}
        onChange={onAvatarChange}
      />
      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-500">{t("usernameLabel")}</span>
        <Input
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          placeholder="haroya"
          pattern="^[a-z0-9][a-z0-9_]{2,15}$"
          maxLength={16}
        />
        <p className="text-[11px] text-slate-400">
          {profile?.username ? t("usernameChangeHint") : t("usernameHint")}
        </p>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-500">{t("bioLabel")}</span>
        <textarea
          value={bio}
          onChange={(e) => onBioChange(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder={t("bioPlaceholder")}
          className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        />
        <p className="text-[11px] text-slate-400">{bio.length}/280</p>
      </label>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-slate-500">{t("themeLabel")}</span>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {THEMES.map((tm) => {
            const active = theme === tm.id;
            return (
              <button
                key={tm.id}
                type="button"
                onClick={() => onThemeChange(tm.id)}
                aria-pressed={active}
                className={
                  "group relative aspect-[3/4] overflow-hidden rounded-lg ring-2 ring-offset-1 transition " +
                  (active
                    ? "ring-accent-500"
                    : "ring-transparent hover:ring-slate-300")
                }
              >
                <div className={`absolute inset-0 ${tm.page}`}>
                  {/* Mini sample cards — visualise what an actual link card looks like in this theme. */}
                  <div className="absolute inset-x-2 bottom-2 space-y-1">
                    <div className={`h-2 rounded-sm ${tm.card}`} />
                    <div className={`h-2 rounded-sm ${tm.card}`} />
                  </div>
                </div>
                <div className="relative px-1 py-1 text-[9px] font-medium leading-none text-white mix-blend-difference">
                  {tm.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!profile?.username && (
          <Button onClick={onSave} disabled={savingProfile} size="sm">
            {t("claim")}
          </Button>
        )}
        {profile?.username && !usernameUnchanged && (
          // Sticky on mobile so the button is reachable even when the user has scrolled the
          // username field out of view. Desktop keeps the inline button — sidebar layout means
          // the button is rarely far from the field.
          <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:relative sm:inset-auto sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
            <span className="text-[11px] text-slate-500 sm:hidden">
              {t("usernameUnsaved")}
            </span>
            <Button onClick={onSave} disabled={savingProfile} size="sm">
              {t("usernameChangeAction")}
            </Button>
          </div>
        )}
        {profile?.username && usernameUnchanged && <AutoSaveIndicator status={autoSaveStatus} t={t} />}
      </div>

      {profile?.publicUrl && (
        // Promoted to its own row so it doesn't compete with the save button / autosave hint —
        // share-my-profile is a separate intent from "did my edit save".
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
          <PublicUrlPill url={profile.publicUrl} t={t} />
          <QrButton
            url={profile.publicUrl}
            filename={`${profile.username}.png`}
            logoSrc="/icon.svg"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Inline autosave feedback. The previous text-only "자동 저장됨" was easy to miss; now the
 * "saved" state animates a green checkmark so the eye catches it. Idle state shows a static
 * hint so users know they don't need to hit Save.
 */
function AutoSaveIndicator({
  status,
  t,
}: {
  status: "idle" | "saving" | "saved";
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t("autosaving")}
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 animate-fade-in">
        <Check className="h-3 w-3" />
        {t("autosaved")}
      </span>
    );
  }
  return <span className="text-[11px] text-slate-400">{t("autosaveHint")}</span>;
}
