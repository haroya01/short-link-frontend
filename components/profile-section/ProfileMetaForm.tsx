"use client";

import { useState } from "react";
import { Check, ChevronDown, Eye, Loader2 } from "lucide-react";
import type { useTranslations } from "next-intl";
import { AvatarPicker } from "../avatar-picker";
import { BannerPicker } from "../banner-picker";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import type { MyProfile, ProfileTheme, ShareChannel, Social } from "@/types";
import { ChannelIcon } from "@/app/[locale]/u/[username]/_components/ShareRow";
import { socialUrlPrefix } from "./socials-templates";

const SHARE_CHANNELS: ShareChannel[] = [
  "instagram",
  "x",
  "linkedin",
  "threads",
  "facebook",
  "kakao",
  "line",
];
const MAX_SOCIALS = 2;

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
  {
    id: "wave",
    label: "Wave",
    page: "theme-wave-anim",
    card: "bg-white/85 backdrop-blur-sm border border-sky-200",
  },
  {
    id: "ember",
    label: "Ember",
    page: "theme-ember-anim",
    card: "bg-white/85 backdrop-blur-sm border border-orange-200",
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
  socials: Social[];
  onSocialsChange: (next: Social[]) => void;
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
  socials,
  onSocialsChange,
  onSave,
  t,
}: Props) {
  const usernameUnchanged =
    profile?.username && username.trim().toLowerCase() === profile.username.toLowerCase();
  // Theme picker is collapsed by default for first-time editors — it was the largest visual
  // block on the page (9 swatch cards, 3-col grid) for a setting most users won't change. Stays
  // open once expanded so the user can swatch-compare without re-toggling each time.
  const [themeOpen, setThemeOpen] = useState<boolean>(theme != null);

  return (
    <div className="space-y-3">
      {/* Stack on small / sidebar widths. lg+ : banner takes 2/3 of the row, avatar 1/3. Using
          `lg:` (not `md:`) keeps the breakpoint comfortably above the editor's natural width so a
          scrollbar appearing / vanishing doesn't make the grid flip columns and visibly jolt. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BannerPicker currentUrl={profile?.bannerUrl ?? null} onChange={onBannerChange} />
        </div>
        <div className="lg:col-span-1">
          <AvatarPicker
            currentUrl={profile?.avatarUrl ?? null}
            initialChar={(username[0] ?? "·").toUpperCase()}
            onChange={onAvatarChange}
          />
        </div>
      </div>
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
        <button
          type="button"
          onClick={() => setThemeOpen((v) => !v)}
          aria-expanded={themeOpen}
          className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left transition hover:bg-slate-50"
        >
          <span className="text-xs font-medium text-slate-500">
            {t("themeLabel")}
            {theme && (
              <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                {THEMES.find((tm) => tm.id === theme)?.label ?? theme}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-slate-400 transition-transform",
              themeOpen && "rotate-180",
            )}
          />
        </button>
        {themeOpen && (
          // max-w-md so cards don't stretch into 150×200 blocks when the editor pane is wide
          // (lg+ : ~640px). Capped width also makes the picker read as "swatches" rather than a
          // full-width hero strip.
          <div className="grid max-w-md grid-cols-3 gap-2 sm:grid-cols-4">
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
                    (active ? "ring-accent-500" : "ring-transparent hover:ring-slate-300")
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
        )}
      </div>

      <SocialsPicker socials={socials} onChange={onSocialsChange} t={t} />

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

/**
 * Editor block for {@link Social} entries. Chip click toggles the channel; an active chip exposes
 * a URL input — the visitor lands there when they tap that button on the public profile. Capped at
 * {@link MAX_SOCIALS}; selecting beyond the cap is a no-op (chip stays inactive).
 *
 * <p>Order matters: chips are rendered in the order the user picked them, and that order survives
 * into the public profile's share row. We don't validate URLs here — the autosave path strips
 * blank URLs (so users can leave a chip active while drafting) and the backend rejects malformed
 * ones at save time.
 */
function SocialsPicker({
  socials,
  onChange,
  t,
}: {
  socials: Social[];
  onChange: (next: Social[]) => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  function toggle(ch: ShareChannel) {
    const idx = socials.findIndex((s) => s.channel === ch);
    if (idx >= 0) {
      onChange(socials.filter((s) => s.channel !== ch));
    } else if (socials.length < MAX_SOCIALS) {
      // Prefill the channel's URL prefix so the user only types their handle.
      onChange([...socials, { channel: ch, url: socialUrlPrefix(ch) }]);
    }
  }

  function updateUrl(ch: ShareChannel, url: string) {
    onChange(socials.map((s) => (s.channel === ch ? { channel: ch, url } : s)));
  }

  const remaining = MAX_SOCIALS - socials.length;

  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50/30 p-3">
      <div className="flex items-baseline justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
          <Eye className="h-3 w-3 text-slate-400" />
          {t("socialsLabel")}
        </span>
        <span className="text-[10px] text-slate-400">
          {t("socialsCount", { count: socials.length, max: MAX_SOCIALS })}
        </span>
      </div>
      <p className="text-[11px] text-slate-500">{t("socialsHint")}</p>
      <div className="flex flex-wrap gap-1.5">
        {SHARE_CHANNELS.map((ch) => {
          const active = socials.some((s) => s.channel === ch);
          const disabled = !active && remaining === 0;
          const order = socials.findIndex((s) => s.channel === ch) + 1;
          return (
            <button
              key={ch}
              type="button"
              onClick={() => toggle(ch)}
              disabled={disabled}
              aria-pressed={active}
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors " +
                (active
                  ? "border-accent-300 bg-accent-50 text-accent-800"
                  : disabled
                    ? "border-slate-100 bg-white text-slate-300"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")
              }
            >
              <ChannelIcon channel={ch} className="h-3 w-3" />
              {channelLabel(ch)}
              {active && <span className="text-[9px] text-accent-600">#{order}</span>}
            </button>
          );
        })}
      </div>
      {socials.length > 0 && (
        <div className="mt-2 space-y-1.5 rounded-md border border-slate-100 bg-slate-50/60 p-2">
          {socials.map((s) => (
            <label key={s.channel} className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200">
                <ChannelIcon channel={s.channel} className="h-3 w-3" />
              </span>
              <Input
                type="url"
                inputMode="url"
                value={s.url}
                onChange={(e) => updateUrl(s.channel, e.target.value)}
                placeholder={urlPlaceholderKey(s.channel, t)}
                maxLength={256}
                className="h-8 flex-1 text-xs"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function channelLabel(channel: ShareChannel): string {
  switch (channel) {
    case "x":
      return "X";
    case "line":
      return "LINE";
    case "threads":
      return "Threads";
    case "facebook":
      return "Facebook";
    case "kakao":
      return "카카오톡 채널";
    case "instagram":
      return "Instagram";
    case "linkedin":
      return "LinkedIn";
  }
}

function urlPlaceholderKey(
  channel: ShareChannel,
  t: ReturnType<typeof useTranslations<"settings.profile">>,
): string {
  switch (channel) {
    case "x":
      return t("socialUrlPlaceholderX");
    case "line":
      return t("socialUrlPlaceholderLine");
    case "threads":
      return t("socialUrlPlaceholderThreads");
    case "facebook":
      return t("socialUrlPlaceholderFacebook");
    case "kakao":
      return t("socialUrlPlaceholderKakao");
    case "instagram":
      return t("socialUrlPlaceholderInstagram");
    case "linkedin":
      return t("socialUrlPlaceholderLinkedin");
  }
}
