"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { useRouter } from "@/i18n/navigation";

/**
 * Auto-redirect destination used after the "Make your profile" CTA login flow. Sends users to
 * their own /u/&lt;handle&gt; if they've claimed a username, otherwise to /settings/profile where
 * the onboarding flow takes over. Keeps the showcase CTA single-target without baking the
 * conditional into every caller.
 */
export default function ProfileAutoPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const { authenticated, ready, me } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      router.replace("/login?next=/profile/auto");
      return;
    }
    if (me?.username) {
      router.replace(`/u/${me.username}`);
    } else {
      router.replace("/settings/profile");
    }
  }, [authenticated, ready, me, router]);

  return (
    <div className="container max-w-md py-20 text-center">
      <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" />
      <p className="mt-3 text-sm text-slate-500">{t("callbackProcessing")}</p>
    </div>
  );
}
