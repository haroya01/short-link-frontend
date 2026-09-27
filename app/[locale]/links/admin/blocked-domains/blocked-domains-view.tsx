"use client";

import { notFound } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { BlockedDomainManager } from "@/components/admin/blocked-domain-manager";

export function AdminBlockedDomainsView() {
  const { ready, authenticated, isAdmin } = useAuth();
  if (!ready) return null;
  if (!authenticated || !isAdmin) notFound();
  return (
    <main className="container max-w-6xl py-10">
      <BlockedDomainManager />
    </main>
  );
}
