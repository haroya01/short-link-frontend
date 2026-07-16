"use client";

import { notFound } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AbuseReportsManager } from "@/components/admin/abuse-reports-manager";

export function AdminAbuseReportsView() {
  const { ready, authenticated, isAdmin } = useAuth();

  // No login bounce, no 403 — anyone who isn't a signed-in admin gets a hard 404 so the surface's
  // existence never leaks. Matches the apex /admin overview.
  if (!ready) return null;
  if (!authenticated || !isAdmin) notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <AbuseReportsManager />
    </main>
  );
}
