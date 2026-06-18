// Bundle entry for the kurl Design System on claude.ai/design.
//
// This repo is a Next.js app, not a published component library, so there is no
// dist/ barrel to point the converter at. This file is that barrel: it re-exports
// the scoped components by their real source modules (resolved through the repo's
// "@/*" tsconfig alias) plus DSProvider, a preview-only wrapper that supplies the
// contexts the components read (next-intl, the Next app-router, toasts). esbuild
// bundles every export here onto window.<globalName>; previews import them back
// from the package name and render the real shipped code.
import "./ds-process-shim"; // must stay first — defines `process` before any component module evaluates
import * as React from "react";
import { NextIntlClientProvider } from "next-intl";
import koMessages from "@/messages/ko.json";
import { ToastProvider } from "@/components/ui/toast";

// Wraps every preview so components that read next-intl / toasts get a live
// context instead of throwing. Next routing (next/link, next/navigation,
// next-view-transitions) is redirected to preview-only stubs via
// .design-sync/tsconfig.json, so no router context is needed here. Korean is the
// brand-primary locale.
export function DSProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider
      locale="ko"
      messages={koMessages as Record<string, unknown>}
      timeZone="Asia/Seoul"
    >
      <ToastProvider>{children}</ToastProvider>
    </NextIntlClientProvider>
  );
}

// ── Primitives (components/ui) ────────────────────────────────────────────────
export { Button, buttonVariants } from "@/components/ui/button";
export type { ButtonProps } from "@/components/ui/button";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
export { Input } from "@/components/ui/input";
export type { InputProps } from "@/components/ui/input";
export { Textarea } from "@/components/ui/textarea";
export type { TextareaProps } from "@/components/ui/textarea";
export { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
export { Skeleton } from "@/components/ui/skeleton";
export { ConfirmDialog } from "@/components/ui/dialog";
export { ToastProvider, useToast } from "@/components/ui/toast";

// ── Blog surface (modules/blog/components) ────────────────────────────────────
export { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
export { DiscoveryCard, DiscoveryGrid, DiscoveryCell } from "@/modules/blog/components/discovery-card";
export { KurlLinkCard } from "@/modules/blog/components/kurl-link-card";
export { TagChip } from "@/modules/blog/components/tag-chip";
export { PostStatusBadge } from "@/modules/blog/components/post-status-badge";
export { Avatar } from "@/modules/blog/components/avatar";

// ── Links surface (components/links) ──────────────────────────────────────────
export { ResultCard } from "@/components/links/shorten/result-card";
export { CampaignsEntryCard } from "@/components/links/campaigns/entry-card";
export { StatsCards } from "@/components/links/stats/cards";
