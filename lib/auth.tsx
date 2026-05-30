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

// Module-level guard so that overlapping mount effects (Strict Mode double-fires in dev, plus an
// auth:change event arriving mid-mount) don't race to claim the same anonymous tokens.
let claimAttempted = false;

async function tryClaimPendingLinks() {
  if (claimAttempted) return;
  claimAttempted = true;
  const tokens = readPendingClaimTokens();
  if (tokens.length === 0) return;
  try {
    const result = await claimAnonymousLinks(tokens);
    if (result.claimed > 0 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kurl:claimed", { detail: { count: result.claimed } }),
      );
    }
  } catch {
    // best-effort; still clear local tokens below to avoid retry storms
  } finally {
    clearClaimTokens(tokens);
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
    // Stash the current path unless we're on /login (which sets its own ?next=) or the callback;
    // same-origin sessionStorage carries it through the OAuth round-trip.
    if (!/\/(login|auth\/callback)(\/|$)/.test(window.location.pathname)) {
      sessionStorage.setItem("kurl:login-next", window.location.pathname + window.location.search);
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
