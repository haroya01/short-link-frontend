"use client";

import { useCallback, useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { claimAnonymousLinks, getMe, logout as apiLogout, readToken } from "./api";
import { clearClaimTokens, readPendingClaimTokens } from "./recent-links";
import type { Me } from "@/types";

type AuthState = {
  authenticated: boolean;
  ready: boolean;
  me: Me | null;
};

// Module-level guard so that multiple useAuth instances mounting concurrently after login
// (Nav + page + dashboard, etc.) don't all race to claim the same tokens.
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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    ready: false,
    me: null,
  });

  useEffect(() => {
    const sync = async () => {
      const token = readToken();
      if (!token) {
        setState({ authenticated: false, ready: true, me: null });
        return;
      }
      try {
        const me = await getMe();
        setState({ authenticated: true, ready: true, me });
        // Attach the user to Sentry so captured errors / breadcrumbs are tied back to a real
        // account when triaging. Email kept out — id + role is enough for cross-referencing the
        // admin "recent errors" pane (which already exposes the numeric userId).
        Sentry.setUser({ id: String(me.id) });
        Sentry.setTag("role", me.role);
        tryClaimPendingLinks();
      } catch {
        setState({ authenticated: false, ready: true, me: null });
        Sentry.setUser(null);
      }
    };
    sync();
    const onChange = () => sync();
    window.addEventListener("auth:change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
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

  return {
    ...state,
    isAdmin: state.me?.role === "ADMIN",
    signInWithGoogle,
    signOut,
  };
}
