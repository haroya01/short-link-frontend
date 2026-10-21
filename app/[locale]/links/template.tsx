import type { ReactNode } from "react";
import { PageTransition } from "@/modules/blog/components/page-transition";

export default function LinksTemplate({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
