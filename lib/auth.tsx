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
import { claimAnonymousLinks, getMe, logout as apiLogout, readToken } from "./api";
import { clearClaimTokens, readPendingClaimTokens } from "./recent-links";
import type { Me } from "@/types";

type AuthState = {
  authenticated: boolean;
  ready: boolean;
  me: Me | null;
};

type AuthContextValue = AuthState & {
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
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    ready: false,
    me: null,
  });

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const token = readToken();
      if (!token) {
        if (!cancelled) setState({ authenticated: false, ready: true, me: null });
        return;
      }
      try {
        const me = await getMe();
        if (cancelled) return;
        setState({ authenticated: true, ready: true, me });
        // Attach the user to Sentry so captured errors / breadcrumbs are tied back to a real
        // account when triaging. Email kept out — id + role is enough for cross-referencing the
        // admin "recent errors" pane (which already exposes the numeric userId).
        Sentry.setUser({ id: String(me.id) });
        Sentry.setTag("role", me.role);
        tryClaimPendingLinks();
      } catch {
        if (cancelled) return;
        setState({ authenticated: false, ready: true, me: null });
        Sentry.setUser(null);
      }
    };
    sync();
    const onChange = () => sync();
    window.addEventListener("auth:change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("auth:change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const signInWithGoogle = useCallback(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";
    window.location.href = apiBase + "/oauth2/authorization/google";
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    Sentry.setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAdmin: state.me?.role === "ADMIN",
      signInWithGoogle,
      signOut,
    }),
    [state, signInWithGoogle, signOut],
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
