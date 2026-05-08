"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { claimAnonymousLinks, getMe, logout as apiLogout, readToken } from "./api";
import { clearClaimTokens, readPendingClaimTokens } from "./recent-links";
import type { Me } from "@/types";

type AuthState = {
  authenticated: boolean;
  ready: boolean;
  me: Me | null;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    ready: false,
    me: null,
  });
  const claimedRef = useRef(false);

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
        if (!claimedRef.current) {
          claimedRef.current = true;
          const tokens = readPendingClaimTokens();
          if (tokens.length > 0) {
            try {
              await claimAnonymousLinks(tokens);
            } catch {
              // best-effort; still clear local tokens to avoid retry storms
            } finally {
              clearClaimTokens(tokens);
            }
          }
        }
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
