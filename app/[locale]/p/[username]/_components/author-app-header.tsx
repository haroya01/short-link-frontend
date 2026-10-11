"use client";

import { AppHeader } from "@/components/common/app-header";
import { ComposeEntry } from "@/modules/blog/components/compose-entry";

export function AuthorAppHeader() {
  return <AppHeader showMenu={false} slimMobile sections product="blog" compose={ComposeEntry} />;
}
