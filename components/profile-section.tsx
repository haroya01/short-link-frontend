"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import {
  getMyProfile,
  listMyLinks,
  toggleLinkOnProfile,
  updateMyProfile,
} from "@/lib/api";
import type { MyLink, MyProfile } from "@/types";

/**
 * Public-profile editor: claim a username (one-shot for now), set a short bio, then toggle which
 * of the user's existing links appear on `/u/{username}`. Toggle state isn't part of the link list
 * payload, so we keep a local Set seeded from the profile fetch and PUT the diff per click.
 */
export function ProfileSection() {
  const t = useTranslations("settings.profile");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [links, setLinks] = useState<MyLink[] | null>(null);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [pendingShortCode, setPendingShortCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyProfile(), listMyLinks({ page: 1, size: 100 })])
      .then(([prof, page]) => {
        if (cancelled) return;
        setProfile(prof);
        setUsername(prof.username ?? "");
        setBio(prof.bio ?? "");
        setLinks(page.items);
      })
      .catch(() => {
        if (!cancelled) setLinks([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Profile fetch doesn't carry per-link toggle state, so we ask the public endpoint once a
  // username exists. Avoids a separate "list profile members" backend route.
  useEffect(() => {
    if (!profile?.username) return;
    let cancelled = false;
    fetch(
      `${process.env.NEXT_PUBLIC_API_BASE ?? ""}/api/v1/public/profiles/${encodeURIComponent(
        profile.username,
      )}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const codes = new Set<string>(
          (data.links as { shortCode: string }[]).map((l) => l.shortCode),
        );
        setShown(codes);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profile?.username]);

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const updated = await updateMyProfile({
        username: username.trim() || undefined,
        bio: bio.trim(),
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
      setShown((prev) => {
        const out = new Set(prev);
        if (next) out.add(shortCode);
        else out.delete(shortCode);
        return out;
      });
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    } finally {
      setPendingShortCode(null);
    }
  }

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

        <div className="flex items-center gap-3">
          <Button onClick={handleSaveProfile} disabled={savingProfile} size="sm">
            {t("save")}
          </Button>
          {profile?.publicUrl && (
            <a
              href={profile.publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
            >
              <ExternalLink className="h-3 w-3" />
              {profile.publicUrl}
            </a>
          )}
        </div>
      </div>

      {profile?.username && (
        <div className="space-y-2 border-t border-slate-100 pt-5">
          <p className="text-xs font-medium text-slate-700">{t("linksTitle")}</p>
          <p className="text-[11px] text-slate-500">{t("linksHint")}</p>
          {links === null ? (
            <p className="text-xs text-slate-400">{t("loading")}</p>
          ) : links.length === 0 ? (
            <p className="text-xs text-slate-500">{t("noLinks")}</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
              {links.map((link) => {
                const on = shown.has(link.shortCode);
                const pending = pendingShortCode === link.shortCode;
                return (
                  <li
                    key={link.shortCode}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm text-slate-900">
                        /{link.shortCode}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">{link.originalUrl}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      disabled={pending}
                      onClick={() => handleToggle(link.shortCode, !on)}
                      className={
                        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition " +
                        (on ? "bg-slate-900" : "bg-slate-200")
                      }
                    >
                      <span
                        className={
                          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition " +
                          (on ? "translate-x-4" : "translate-x-0.5")
                        }
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
