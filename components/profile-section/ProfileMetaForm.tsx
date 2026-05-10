"use client";

import type { useTranslations } from "next-intl";
import { AvatarPicker } from "../avatar-picker";
import { BannerPicker } from "../banner-picker";
import { QrButton } from "../qr-button";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type { MyProfile, ProfileTheme } from "@/types";
import { PublicUrlPill } from "./PublicUrlPill";

const THEMES: { id: ProfileTheme; label: string; swatch: string }[] = [
  { id: "light", label: "Light", swatch: "#F8FAFC" },
  { id: "dark", label: "Dark", swatch: "#0F172A" },
  { id: "accent", label: "Accent", swatch: "#0EA5E9" },
  { id: "sunset", label: "Sunset", swatch: "linear-gradient(135deg,#FB923C,#F43F5E)" },
  { id: "ocean", label: "Ocean", swatch: "linear-gradient(135deg,#06B6D4,#0284C7)" },
  { id: "forest", label: "Forest", swatch: "linear-gradient(135deg,#10B981,#0D9488)" },
  { id: "mono", label: "Mono", swatch: "#000000" },
  { id: "neon", label: "Neon", swatch: "linear-gradient(135deg,#D946EF,#22D3EE)" },
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

      <div className="space-y-1">
        <span className="text-xs font-medium text-slate-500">{t("themeLabel")}</span>
        <div className="flex flex-wrap gap-1.5">
          {THEMES.map((tm) => {
            const active = theme === tm.id;
            return (
              <button
                key={tm.id}
                type="button"
                onClick={() => onThemeChange(tm.id)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition " +
                  (active
                    ? "border-accent-300 bg-accent-50 text-accent-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")
                }
              >
                <span
                  className="h-3 w-3 rounded-full border border-slate-200"
                  style={
                    tm.swatch.startsWith("linear-gradient")
                      ? { backgroundImage: tm.swatch }
                      : { backgroundColor: tm.swatch }
                  }
                />
                {tm.label}
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
          <Button onClick={onSave} disabled={savingProfile} size="sm">
            {t("usernameChangeAction")}
          </Button>
        )}
        {profile?.username && usernameUnchanged && (
          <span className="text-[11px] text-slate-400">
            {autoSaveStatus === "saving"
              ? t("autosaving")
              : autoSaveStatus === "saved"
                ? t("autosaved")
                : t("autosaveHint")}
          </span>
        )}
        {profile?.publicUrl && (
          <div className="flex items-center gap-2">
            <PublicUrlPill url={profile.publicUrl} t={t} />
            <QrButton
              url={profile.publicUrl}
              filename={`${profile.username}.png`}
              logoSrc="/icon.svg"
            />
          </div>
        )}
      </div>
    </div>
  );
}
