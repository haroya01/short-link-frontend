"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";

/**
 * Floating "edit" button shown on a public profile page when the visitor is the owner. The
 * profile page is intentionally chrome-less (no global nav) so visitors see a clean bio link —
 * but that leaves the owner without a path back to /profile/edit. This restores it without
 * breaking the chrome-less feel: only the owner sees it, and only on their own page.
 */
export function ProfileOwnerFab({ username }: { username: string }) {
  const t = useTranslations("publicProfile");
  const { authenticated, ready, me } = useAuth();
  if (!ready || !authenticated) return null;
  // Normalize both sides — backend lowercases on save but the URL segment can be in any case.
  const mineLc = (me?.username ?? "").toLowerCase();
  if (!mineLc || mineLc !== username.toLowerCase()) return null;
  return (
    <Link
      href="/settings/profile"
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-[60] inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:shadow-2xl active:scale-95"
    >
      <Pencil className="h-4 w-4" />
      {t("editFab")}
    </Link>
  );
}
