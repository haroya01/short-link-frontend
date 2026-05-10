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
  if ((me?.username ?? null) !== username) return null;
  return (
    <Link
      href="/profile/edit"
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <Pencil className="h-3.5 w-3.5" />
      {t("editFab")}
    </Link>
  );
}
