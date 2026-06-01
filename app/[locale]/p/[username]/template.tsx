import type { ReactNode } from "react";
import { PageTransition } from "@/modules/blog/components/page-transition";

/**
 * Route-entry crossfade for the public author surface (profile / posts / about / series / post).
 * `fade` mode (opacity-only): these pages already run their own CSS content entrance
 * (author-tab-enter / profile-fade), so this just smooths the navigation between them without
 * stacking a second vertical rise.
 */
export default function AuthorTemplate({ children }: { children: ReactNode }) {
  return <PageTransition mode="fade">{children}</PageTransition>;
}
