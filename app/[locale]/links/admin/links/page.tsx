"use client";

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { LinkBrowser } from "@/components/admin/link-browser";

export default function AdminLinksPage() {
  const { ready, authenticated, isAdmin } = useAuth();
  // Keep the skeleton until `ready` so a legitimate admin on a slow /me never flashes 404.
  if (!ready) return null;
  if (!authenticated || !isAdmin) notFound();
  return (
    <main className="container max-w-6xl py-10">
      {/* LinkBrowser reads ownerId from the query string via useSearchParams. */}
      <Suspense fallback={null}>
        <LinkBrowser />
      </Suspense>
    </main>
  );
}
