"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import { updateMyProfile } from "@/lib/api";
import type { MyProfile, ProfileTheme, Social } from "@/types";
import { socialUrlPrefix } from "@/components/blog/curation/socials-templates";

export type AutoSaveStatus = "idle" | "saving" | "saved";

type Args = {
  profile: MyProfile | null;
  bio: string;
  theme: ProfileTheme | null;
  socials: Social[];
  /** Called with the API's canonical profile after each successful autosave. */
  onSaved: (profile: MyProfile) => void;
};

/**
 * Debounced autosave for bio + theme + socials. Username stays explicit because changing it costs
 * the user their old URL — we want intent for that, but everything else should "just save" so the
 * editor feels alive.
 *
 * The 600ms timer fires after the last change. A `lastSavedRef` snapshot guards against the
 * initial-hydration render firing a redundant save, and against socials drafts that are still just
 * the channel prefix (e.g. `https://x.com/` before the user types their handle).
 */
export function useProfileAutosave({
  profile,
  bio,
  theme,
  socials,
  onSaved,
}: Args): AutoSaveStatus {
  const t = useTranslations("settings.profile");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const lastSavedRef = useRef<{
    bio: string;
    theme: ProfileTheme | null;
    socials: string;
  } | null>(null);

  useEffect(() => {
    if (!profile?.username) return;
    const socialsCleaned = socials.filter((s) => {
      const url = s.url.trim();
      if (url.length === 0) return false;
      if (url === socialUrlPrefix(s.channel)) return false;
      return true;
    });
    const socialsJson = socialsCleaned.length === 0 ? "" : JSON.stringify(socialsCleaned);
    if (lastSavedRef.current === null) {
      lastSavedRef.current = {
        bio: profile.bio ?? "",
        theme: profile.theme ?? null,
        socials: (profile.socials ?? []).length === 0 ? "" : JSON.stringify(profile.socials),
      };
      return;
    }
    if (
      lastSavedRef.current.bio === bio &&
      lastSavedRef.current.theme === theme &&
      lastSavedRef.current.socials === socialsJson
    )
      return;
    setStatus("saving");
    const timer = setTimeout(async () => {
      try {
        const updated = await updateMyProfile({
          bio: bio.trim(),
          theme: theme ?? undefined,
          socials: socialsJson,
        });
        onSaved(updated);
        lastSavedRef.current = { bio, theme, socials: socialsJson };
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1500);
      } catch (err) {
        toast(errorMessage(err, t("saveFailed")), "error");
        setStatus("idle");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [
    bio,
    theme,
    socials,
    profile?.username,
    profile?.bio,
    profile?.theme,
    profile?.socials,
    errorMessage,
    onSaved,
    t,
    toast,
  ]);

  return status;
}
