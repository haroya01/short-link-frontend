"use client";

import { Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { linksHref } from "@/lib/host";

/**
 * Floating "edit" button shown on a public profile page when the visitor is the owner. The
 * profile page is intentionally chrome-less (no global nav) so visitors see a clean bio link —
 * but that leaves the owner without a path back to /settings/profile. This restores it without
 * breaking the chrome-less feel: only the owner sees it, and only on their own page.
 */
export function ProfileOwnerFab({ username }: { username: string }) {
  const t = useTranslations("publicProfile");
  const locale = useLocale();
  const { authenticated, ready, me } = useAuth();
  if (!ready || !authenticated) return null;
  // Normalize both sides — backend lowercases on save but the URL segment can be in any case.
  const mineLc = (me?.username ?? "").toLowerCase();
  if (!mineLc || mineLc !== username.toLowerCase()) return null;
  return (
    // Cross-host hop: this card lives on {user}.kurl.me but /settings/profile belongs to the links
    // product (kurl.me). An i18n Link would target the subdomain origin, which the CF worker rewrites
    // to a non-existent /u/{user} route (404) — so pin it to the links host with linksHref (absolute
    // in prod, same-origin path in dev/preview) and use a plain <a> full load, like blog/settings.
    <a
      href={linksHref(`/${locale}/settings/profile`)}
      className="focus-ring fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-[60] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
    >
      <Pencil aria-hidden className="h-4 w-4 text-slate-500" />
      {t("editFab")}
    </a>
  );
}
