import type { ReactNode } from "react";
import { PageTransition } from "@/modules/blog/components/page-transition";

/**
 * Route-entry crossfade for the link-in-bio profile. `fade` mode (opacity-only) — the profile cards
 * already cascade in via the `profile-fade` CSS entrance, so this only smooths navigation onto the
 * page without a second rise.
 */
export default function ProfileTemplate({ children }: { children: ReactNode }) {
  return <PageTransition mode="fade">{children}</PageTransition>;
}
