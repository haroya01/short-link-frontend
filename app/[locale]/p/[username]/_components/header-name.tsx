"use client";

import { useOwnProfile } from "@/modules/blog/lib/own-profile";

export function HeaderName({ name, username }: { name: string; username: string }) {
  const own = useOwnProfile(username);
  return <>{own ? own.displayName || username : name}</>;
}
