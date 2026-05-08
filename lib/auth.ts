"use client";

import { useCallback, useEffect, useState } from "react";
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
        tryClaimPendingLinks();
      } catch {
        setState({ authenticated: false, ready: true, me: null });
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
    window.location.href = "/oauth2/authorization/google";
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
  }, []);

  return {
    ...state,
    isAdmin: state.me?.role === "ADMIN",
    signInWithGoogle,
    signOut,
  };
}
