"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Sentry from "@sentry/nextjs";

import { claimAnonymousLinks, logout as apiLogout } from "./api";
import { bootstrapSession } from "./api/client";
import { clearClaimTokens, readPendingClaimTokens } from "./recent-links";
import { writeLoginNextCookie } from "./login-next-cookie";
import { useMe } from "@/hooks/use-me";
import type { Me } from "@/types";

type AuthContextValue = {
  authenticated: boolean;
  ready: boolean;
  me: Me | null;
  isAdmin: boolean;
  signInWithGoogle: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Module-level guards so that overlapping mount effects (Strict Mode double-fires in dev, plus an
// auth:change event arriving mid-mount) don't race to claim the same anonymous tokens. claimInFlight
// stays set across the retry wait too, so a concurrent trigger can't storm.
let claimInFlight = false;
let claimDone = false;
const CLAIM_RETRY_DELAY_MS = 4000;

// 토큰은 성공했을 때만 지운다. 실패 시 지우면 익명 링크가 영영 귀속 불가일 뿐 아니라 24h TTL 이 그대로
// 흘러 링크 자체가 조용히 만료된다 — 그래서 실패엔 토큰을 보존하고(다음 로그인/세션에서 재시도, 24h 지나면
// localStorage 에서 자연 만료) 일시 블립만 세션 내 1회 지연 재시도한다.
async function tryClaimPendingLinks(retriesLeft = 1) {
  if (claimInFlight || claimDone) return;
  const tokens = readPendingClaimTokens();
  if (tokens.length === 0) return;
  claimInFlight = true;
  try {
    const result = await claimAnonymousLinks(tokens);
    clearClaimTokens(tokens);
    claimDone = true;
    claimInFlight = false;
    if (result.claimed > 0 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kurl:claimed", { detail: { count: result.claimed } }),
      );
    }
  } catch {
    if (retriesLeft > 0 && typeof window !== "undefined") {
      window.setTimeout(() => {
        claimInFlight = false;
        void tryClaimPendingLinks(retriesLeft - 1);
      }, CLAIM_RETRY_DELAY_MS);
    } else {
      claimInFlight = false;
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const meQuery = useMe();
  const me = meQuery.data ?? null;
  // Keep the first client render structurally identical to SSR. Token state is browser-only, so
  // auth-dependent UI must wait until after mount before deciding between anonymous and signed-in.
  // Also hold until the session bootstrap (refresh-cookie recovery) resolves, so a subdomain switch
  // doesn't flash "signed out" before the token is recovered.
  const ready = mounted && bootstrapped && !meQuery.isLoading;
  const authenticated = !!me;

  const meId = me?.id ?? null;
  const meRole = me?.role ?? null;

  useEffect(() => {
    setMounted(true);
    // Recover the session from the shared .kurl.me refresh cookie when this origin has no token
    // (e.g. just landed on blog.kurl.me from kurl.me). setToken fires auth:change, which enables
    // the /me query. No token present → resolves immediately as anonymous.
    let active = true;
    void bootstrapSession().finally(() => {
      if (active) setBootstrapped(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!meId || !meRole) {
      Sentry.setUser(null);
      return;
    }
    // Email kept out — id + role is enough for cross-referencing the admin "recent errors" pane
    // (which already exposes the numeric userId).
    Sentry.setUser({ id: String(meId) });
    Sentry.setTag("role", meRole);
    tryClaimPendingLinks();
  }, [meId, meRole]);

  const signInWithGoogle = useCallback(() => {
    // Return to where login started (blog, profile, …) instead of always landing on /dashboard.
    // Stash the current path unless we're on /login (which sets its own ?next=) or the callback.
    // A `.kurl.me` cookie (not sessionStorage) carries it through the OAuth round-trip: login often
    // starts on blog.kurl.me / {author}.kurl.me but the callback lands on the apex — a per-origin
    // sessionStorage stash is gone by then, so every blog login fell back to /dashboard.
    if (!/\/(login|auth\/callback)(\/|$)/.test(window.location.pathname)) {
      writeLoginNextCookie(window.location.href);
    }
    const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";
    window.location.href = apiBase + "/oauth2/authorization/google";
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    Sentry.setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authenticated,
      ready,
      me,
      isAdmin: me?.role === "ADMIN",
      signInWithGoogle,
      signOut,
    }),
    [authenticated, ready, me, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Fallback used when a consumer mounts outside the provider (e.g., a storybook story or a leaked
// test render). Returns `ready: false` so callers keep showing their skeleton instead of
// flashing "anonymous" — and crucially does NOT fire its own /me, so the structural fix holds.
const FALLBACK: AuthContextValue = {
  authenticated: false,
  ready: false,
  me: null,
  isAdmin: false,
  signInWithGoogle: () => {
    if (typeof window === "undefined") return;
    const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";
    window.location.href = apiBase + "/oauth2/authorization/google";
  },
  signOut: async () => {
    /* no-op outside provider */
  },
};

export function useAuth(): AuthContextValue {
  return useContext(AuthContext) ?? FALLBACK;
}
