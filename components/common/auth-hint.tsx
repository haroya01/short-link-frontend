"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The server's first-paint guess at whether the visitor is signed in — derived from the presence of
 * the `refresh_token` cookie (read in the root layout, which is a server component). The client auth
 * (access token in localStorage + `/me`) only resolves after mount, so without this seed the header's
 * auth-dependent bits (Write button, account avatar) flash in on every cold load. Components read it
 * to render the right header at first paint, then reconcile once the real auth settles.
 */
const AuthHintContext = createContext(false);

export function AuthHintProvider({
  initialAuthed,
  children,
}: {
  initialAuthed: boolean;
  children: ReactNode;
}) {
  return <AuthHintContext.Provider value={initialAuthed}>{children}</AuthHintContext.Provider>;
}

export function useAuthHint(): boolean {
  return useContext(AuthHintContext);
}
