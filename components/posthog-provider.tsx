"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PostHogReactProvider } from "posthog-js/react";
import { useAuth } from "@/lib/auth";

/**
 * PostHog product analytics provider — tracks pageviews + autocapture (clicks / form submits)
 * + identifies authenticated users so events can be split by user vs anonymous.
 *
 * <p>SDK init runs once at module load (guarded by typeof window). DSN comes from
 * {@code NEXT_PUBLIC_POSTHOG_KEY} env var — absent → SDK silently skipped, so PR previews /
 * local dev don't error and don't pollute the production project with test traffic.
 *
 * <p>Pageview tracking is manual (not the SDK default) because Next.js App Router doesn't fire
 * a fresh page load on client navigation. We listen to {@code usePathname} changes and read
 * {@code window.location.search} directly instead of {@code useSearchParams} — the latter
 * forces every consuming page into a Suspense boundary at build time, which broke our prior
 * attempt's Vercel build for routes without explicit suspense wrappers.
 */
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

if (typeof window !== "undefined" && POSTHOG_KEY && !(posthog as unknown as { __loaded?: boolean }).__loaded) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "identified_only",
    autocapture: true,
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me } = useAuth();

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (typeof window === "undefined") return;
    const url = window.location.origin + pathname + window.location.search;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname]);

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (me?.id != null) {
      posthog.identify(String(me.id), {
        username: me.username ?? undefined,
        email: me.email,
        tier: me.tier,
      });
    } else {
      posthog.reset();
    }
  }, [me?.id, me?.username, me?.email, me?.tier]);

  return <PostHogReactProvider client={posthog}>{children}</PostHogReactProvider>;
}

/**
 * Tiny wrapper around {@code posthog.capture} that's safe to call when the SDK isn't loaded
 * (PR previews / local dev). Call this from any event point — login, block add, link shorten —
 * and pass a stable event name. Props should be JSON-serializable.
 */
export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (!POSTHOG_KEY) return;
  posthog.capture(event, props);
}
