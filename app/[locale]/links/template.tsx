import type { ReactNode } from "react";
import { PageTransition } from "@/modules/blog/components/page-transition";

/**
 * Route-entry crossfade for the links product (kurl.me dashboard, campaigns, stats, settings…).
 * `fade` mode — a quiet opacity swap on navigation; a dashboard doesn't want a scale/slide, just a
 * smooth handoff between views.
 */
export default function LinksTemplate({ children }: { children: ReactNode }) {
  return <PageTransition mode="fade">{children}</PageTransition>;
}
