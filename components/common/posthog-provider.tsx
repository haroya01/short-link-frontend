"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { PostHog } from "posthog-js";
import { useAuth } from "@/lib/auth";

/**
 * PostHog product analytics provider — tracks pageviews + autocapture (clicks / form submits)
 * + identifies authenticated users so events can be split by user vs anonymous.
 *
 * <p>The SDK (~55KB gz) is loaded via a dynamic import so it never sits in the critical-path
 * client bundle every surface ships — it resolves as a separate chunk after hydration and all
 * captures are routed through {@link loadPostHog}, which fires them once the chunk is ready. DSN
 * comes from {@code NEXT_PUBLIC_POSTHOG_KEY}; absent → the loader resolves null and every call is a
 * silent no-op, so PR previews / local dev don't error and don't pollute the production project.
 *
 * <p>Pageview tracking is manual (not the SDK default) because Next.js App Router doesn't fire
 * a fresh page load on client navigation. We listen to {@code usePathname} changes and read
 * {@code window.location.search} directly instead of {@code useSearchParams} — the latter
 * forces every consuming page into a Suspense boundary at build time, which broke our prior
 * attempt's Vercel build for routes without explicit suspense wrappers.
 *
 * <p>No component consumes {@code usePostHog()} from posthog-js/react, so we render children
 * directly instead of wrapping them in the React provider — that keeps the react binding out of
 * the bundle too.
 */
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

// Memoized loader — the posthog-js chunk is fetched at most once, on the first capture after
// hydration, then reused. Returns null (SSR or no key) so callers can `?.` without guarding.
let clientPromise: Promise<PostHog | null> | null = null;
function loadPostHog(): Promise<PostHog | null> {
  if (typeof window === "undefined" || !POSTHOG_KEY) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("posthog-js").then(({ default: posthog }) => {
      if (!(posthog as unknown as { __loaded?: boolean }).__loaded) {
        posthog.init(POSTHOG_KEY!, {
          api_host: POSTHOG_HOST,
          capture_pageview: false,
          capture_pageleave: true,
          person_profiles: "identified_only",
          autocapture: true,
          // Cookieless — keep the distinct_id in localStorage, never a cookie. The app promises "no
          // analytics or ad cookies" (cookie banner + privacy page); PostHog's default
          // "localStorage+cookie" would set one, so this keeps that promise literally true while
          // analytics still works.
          persistence: "localStorage",
          // Disable session replay — rrweb posts to /s/ every few seconds per active tab, which
          // floods the network panel and burns the PostHog quota. Autocapture + explicit track()
          // events already give us the behavioral signal we want without the per-frame DOM diffing.
          disable_session_recording: true,
        });
      }
      return posthog;
    });
  }
  return clientPromise;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me } = useAuth();
  const wasIdentifiedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = window.location.origin + pathname + window.location.search;
    loadPostHog().then((ph) => ph?.capture("$pageview", { $current_url: url }));
  }, [pathname]);

  useEffect(() => {
    loadPostHog().then((ph) => {
      if (!ph) return;
      if (me?.id != null) {
        ph.identify(String(me.id), {
          username: me.username ?? undefined,
          email: me.email,
          tier: me.tier,
        });
        wasIdentifiedRef.current = true;
      } else if (wasIdentifiedRef.current) {
        // reset()은 로그인→로그아웃 전이에서만. 익명 최초 마운트(또는 /me 로딩 전
        // 일시적 null)에서 호출하면 localStorage에 유지되던 익명 distinct_id가
        // 하드 로드마다 파기돼 유니크 방문자가 조각난다.
        ph.reset();
        wasIdentifiedRef.current = false;
      }
    });
  }, [me?.id, me?.username, me?.email, me?.tier]);

  return <>{children}</>;
}

/**
 * Tiny wrapper around {@code posthog.capture} that's safe to call when the SDK isn't loaded yet
 * (it queues onto the loader promise) or is absent (PR previews / local dev → no-op). Call this
 * from any event point — login, block add, link shorten — with a stable event name. Props should
 * be JSON-serializable.
 */
export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined" || !POSTHOG_KEY) return;
  loadPostHog().then((ph) => ph?.capture(event, props));
}
