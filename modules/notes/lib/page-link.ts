"use client";

import { createContext, useContext } from "react";

const PageLink = createContext<string | null>(null);

export const PageLinkProvider = PageLink.Provider;

export function usePageLink(): string | null {
  return useContext(PageLink);
}
