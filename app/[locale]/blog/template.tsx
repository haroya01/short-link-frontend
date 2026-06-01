import type { ReactNode } from "react";
import { PageTransition } from "@/modules/blog/components/page-transition";

/**
 * Next re-mounts a template on every navigation (unlike layout), so wrapping the blog tree here gives
 * each route change a fresh entry transition (see PageTransition). The workspace chrome (header /
 * sidebar) lives in layout.tsx and stays mounted across navigations — only this inner content
 * animates, so the shell never flashes.
 */
export default function BlogTemplate({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
