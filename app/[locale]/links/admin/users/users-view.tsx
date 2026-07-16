"use client";

import { notFound } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { UserBrowser } from "@/components/admin/user-browser";

export function AdminUsersView() {
  const { ready, authenticated, isAdmin } = useAuth();
  // Keep the skeleton until `ready` so a legitimate admin on a slow /me never flashes 404.
  if (!ready) return null;
  if (!authenticated || !isAdmin) notFound();
  return (
    <main className="container max-w-6xl py-10">
      <UserBrowser />
    </main>
  );
}
