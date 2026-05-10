"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import {
  getMyProfile,
  listMyLinks,
  reorderProfileLinks,
  toggleLinkOnProfile,
  updateMyProfile,
} from "@/lib/api";
import type { MyLink, MyProfile, ProfileTheme } from "@/types";
import { ProfileQuickAdd } from "./profile-quick-add";

const THEMES: { id: ProfileTheme; label: string; swatch: string }[] = [
  { id: "light", label: "Light", swatch: "#F8FAFC" },
  { id: "dark", label: "Dark", swatch: "#0F172A" },
  { id: "accent", label: "Accent", swatch: "#0EA5E9" },
];

export type ProfileDraft = {
  username: string;
  bio: string;
  theme: ProfileTheme | null;
  featured: string[];
  links: MyLink[];
};

type ProfileSectionProps = {
  /** Fires on every local change so a parent can render a live preview alongside. */
  onDraft?: (draft: ProfileDraft) => void;
};

export function ProfileSection({ onDraft }: ProfileSectionProps = {}) {
  const t = useTranslations("settings.profile");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState<ProfileTheme | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [links, setLinks] = useState<MyLink[] | null>(null);
  const [featured, setFeatured] = useState<string[]>([]);
  const [pendingShortCode, setPendingShortCode] = useState<string | null>(null);

  // Bubble local edit state up to the parent on every change so a preview pane can update live
  // without round-tripping. Saved profile state stays separate — the draft IS the source of truth
  // for what visitors will see post-save.
  useEffect(() => {
    onDraft?.({ username, bio, theme, featured, links: links ?? [] });
  }, [username, bio, theme, featured, links, onDraft]);

  const [reload, setReload] = useState(0);
  const refresh = () => setReload((n) => n + 1);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const lastSavedRef = useRef<{ bio: string; theme: ProfileTheme | null } | null>(null);

  // After the username is claimed, bio + theme silently auto-save 600ms after the last change.
  // Username keeps its explicit Save button because it's immutable once set — we want intent for
  // that, but everything else should "just save" so the editor feels alive.
  useEffect(() => {
    if (!profile?.username) return;
    if (lastSavedRef.current === null) {
      lastSavedRef.current = { bio: profile.bio ?? "", theme: profile.theme ?? null };
      return;
    }
    if (lastSavedRef.current.bio === bio && lastSavedRef.current.theme === theme) return;
    setAutoSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        const updated = await updateMyProfile({
          bio: bio.trim(),
          theme: theme ?? undefined,
        });
        setProfile(updated);
        lastSavedRef.current = { bio, theme };
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 1500);
      } catch (err) {
        toast(errorMessage(err, t("saveFailed")), "error");
        setAutoSaveStatus("idle");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [bio, theme, profile?.username, profile?.bio, profile?.theme, errorMessage, t, toast]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyProfile(), listMyLinks({ page: 1, size: 100 })])
      .then(([prof, page]) => {
        if (cancelled) return;
        setProfile(prof);
        setUsername(prof.username ?? "");
        setBio(prof.bio ?? "");
        setTheme(prof.theme ?? null);
        setLinks(page.items);
      })
      .catch(() => {
        if (!cancelled) setLinks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  // The bare profile fetch doesn't carry per-link toggle state, so we hit the public endpoint
  // once a username exists to seed the featured-list order. Future toggle/reorder calls keep the
  // local list authoritative — no need to refetch.
  useEffect(() => {
    if (!profile?.username) {
      setFeatured([]);
      return;
    }
    let cancelled = false;
    fetch(
      `${process.env.NEXT_PUBLIC_API_BASE ?? ""}/api/v1/public/profiles/${encodeURIComponent(
        profile.username,
      )}`,
      { cache: "no-store" },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setFeatured((data.links as { shortCode: string }[]).map((l) => l.shortCode));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profile?.username, reload]);

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const updated = await updateMyProfile({
        username: username.trim() || undefined,
        bio: bio.trim(),
        theme: theme ?? undefined,
      });
      setProfile(updated);
      toast(t("saved"), "success");
    } catch (err) {
      toast(errorMessage(err, t("saveFailed")), "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleToggle(shortCode: string, next: boolean) {
    setPendingShortCode(shortCode);
    try {
      await toggleLinkOnProfile(shortCode, next);
      setFeatured((prev) =>
        next ? [...prev.filter((c) => c !== shortCode), shortCode] : prev.filter((c) => c !== shortCode),
      );
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    } finally {
      setPendingShortCode(null);
    }
  }

  async function move(shortCode: string, direction: -1 | 1) {
    const idx = featured.indexOf(shortCode);
    if (idx < 0) return;
    const swap = idx + direction;
    if (swap < 0 || swap >= featured.length) return;
    const next = featured.slice();
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setFeatured(next);
    try {
      await reorderProfileLinks(next);
    } catch (err) {
      // Rollback optimistic state on save failure so the UI doesn't drift from the server's view.
      setFeatured(featured);
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  const featuredLinks = featured
    .map((code) => links?.find((l) => l.shortCode === code))
    .filter((l): l is MyLink => Boolean(l));
  const otherLinks = (links ?? []).filter((l) => !featured.includes(l.shortCode));

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-xs text-slate-500">{t("intro")}</p>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-500">{t("usernameLabel")}</span>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="haroya"
            pattern="^[a-z0-9][a-z0-9_]{2,15}$"
            maxLength={16}
            disabled={Boolean(profile?.username)}
          />
          <p className="text-[11px] text-slate-400">{t("usernameHint")}</p>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-500">{t("bioLabel")}</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
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
                  onClick={() => setTheme(tm.id)}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition " +
                    (active
                      ? "border-accent-300 bg-accent-50 text-accent-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")
                  }
                >
                  <span
                    className="h-3 w-3 rounded-full border border-slate-200"
                    style={{ backgroundColor: tm.swatch }}
                  />
                  {tm.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!profile?.username && (
            <Button onClick={handleSaveProfile} disabled={savingProfile} size="sm">
              {t("claim")}
            </Button>
          )}
          {profile?.username && (
            <span className="text-[11px] text-slate-400">
              {autoSaveStatus === "saving"
                ? t("autosaving")
                : autoSaveStatus === "saved"
                  ? t("autosaved")
                  : t("autosaveHint")}
            </span>
          )}
          {profile?.publicUrl && <PublicUrlPill url={profile.publicUrl} t={t} />}
        </div>
      </div>

      {profile?.username && (
        <div className="space-y-5 border-t border-slate-100 pt-5">
          <ProfileQuickAdd onAdded={refresh} />
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-700">{t("featuredTitle")}</p>
              <p className="text-[11px] text-slate-500">{t("featuredHint")}</p>
            </div>
          {links === null ? (
            <p className="text-xs text-slate-400">{t("loading")}</p>
          ) : (
            <>
              {featuredLinks.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-200 bg-slate-50/40 p-3 text-center text-[11px] text-slate-500">
                  {t("featuredEmpty")}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
                  {featuredLinks.map((link, idx) => (
                    <li
                      key={link.shortCode}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            aria-label="up"
                            disabled={idx === 0}
                            onClick={() => move(link.shortCode, -1)}
                            className="text-slate-400 hover:text-slate-900 disabled:opacity-30"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="down"
                            disabled={idx === featuredLinks.length - 1}
                            onClick={() => move(link.shortCode, 1)}
                            className="text-slate-400 hover:text-slate-900 disabled:opacity-30"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm text-slate-900">/{link.shortCode}</p>
                          <p className="truncate text-[11px] text-slate-500">{link.originalUrl}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggle(link.shortCode, false)}
                        disabled={pendingShortCode === link.shortCode}
                        className="text-[11px] text-slate-500 hover:text-red-600"
                      >
                        {t("remove")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {otherLinks.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-900">
                    {t("addMore")} ({otherLinks.length})
                  </summary>
                  <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
                    {otherLinks.map((link) => (
                      <li
                        key={link.shortCode}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm text-slate-900">/{link.shortCode}</p>
                          <p className="truncate text-[11px] text-slate-500">{link.originalUrl}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggle(link.shortCode, true)}
                          disabled={pendingShortCode === link.shortCode}
                          className="text-[11px] text-accent-700 hover:text-accent-800"
                        >
                          {t("add")}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

function PublicUrlPill({
  url,
  t,
}: {
  url: string;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — silently no-op */
    }
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900"
      >
        <ExternalLink className="h-3 w-3" />
        {url.replace(/^https?:\/\//, "")}
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label={t("copyPublicUrl")}
        title={t("copyPublicUrl")}
        className="text-slate-400 hover:text-slate-700"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
      </button>
    </span>
  );
}
