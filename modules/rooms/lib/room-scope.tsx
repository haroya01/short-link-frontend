"use client";

import { createContext, useContext, type ReactNode } from "react";

const InsideRoom = createContext<number | null>(null);

export function InsideRoomProvider({ roomId, children }: { roomId: number; children: ReactNode }) {
  return <InsideRoom.Provider value={roomId}>{children}</InsideRoom.Provider>;
}

export function useInsideRoom(): number | null {
  return useContext(InsideRoom);
}
