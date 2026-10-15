"use client";

import type { ReactNode } from "react";
import { useBlockedNames } from "@/modules/blog/lib/user-blocks";

/** Lets a server-rendered card drop out the moment the viewer blocks its author. */
export function HideIfBlocked({ username, children }: { username: string; children: ReactNode }) {
  return useBlockedNames().has(username) ? null : <>{children}</>;
}
