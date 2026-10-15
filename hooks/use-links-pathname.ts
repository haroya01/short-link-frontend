"use client";

import { usePathname } from "@/i18n/navigation";
import { linksPublicPath } from "@/lib/links-path";

export function useLinksPathname(): string {
  return linksPublicPath(usePathname());
}
