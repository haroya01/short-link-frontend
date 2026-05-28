"use client";

import { createContext, useCallback, useContext, useState } from "react";

type SidebarState = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const Ctx = createContext<SidebarState | null>(null);

export function SidebarStateProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  return <Ctx.Provider value={{ open, toggle, close }}>{children}</Ctx.Provider>;
}

export function useSidebarState(): SidebarState {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error("useSidebarState must be used inside SidebarStateProvider");
  }
  return value;
}
