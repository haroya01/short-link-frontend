import type { ReactNode } from "react";

/** Deliberately bare: an entrance here replays on every navigation and reads as flicker. */
export default function BlogTemplate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
