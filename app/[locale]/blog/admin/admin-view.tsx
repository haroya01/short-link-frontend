"use client";

import { notFound } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AbuseReportsManager } from "@/components/admin/abuse-reports-manager";

/**
 * Blog moderation queue — the author-workspace home for admins. The blog layout's WorkspaceBody
 * already gates on authentication (signed-out visitors are bounced to /blog/login) and renders the
 * sidebar shell, so here we only need the admin role check. Non-admins (incl. signed-in authors who
 * reach the URL directly) get a 404 rather than a "you're not allowed" page, matching the apex
 * /admin behaviour. The queue itself reuses {@link AbuseReportsManager}.
 */
export function BlogAdminView() {
  const { ready, authenticated, isAdmin } = useAuth();

  if (!ready) return null;
  if (!authenticated || !isAdmin) notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <AbuseReportsManager />
    </main>
  );
}
