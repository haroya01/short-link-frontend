"use client";

import { useCallback, useEffect, useState } from "react";
import { getMe, logout as apiLogout, readToken, setToken } from "./api";
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

  const signInWithToken = useCallback((token: string) => {
    setToken(token.trim());
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
  }, []);

  return {
    ...state,
    isAdmin: state.me?.role === "ADMIN",
    signInWithGoogle,
    signInWithToken,
    signOut,
  };
}
