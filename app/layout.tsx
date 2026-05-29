import type { ReactNode } from "react";

/**
 * Passthrough root layout. The real document (<html>/<body>, fonts, providers) lives in
 * app/[locale]/layout.tsx; this exists only so Next has a root layout — a requirement once a root
 * app/not-found.tsx is present. It must NOT render <html>/<body> itself (the locale layout would
 * nest a second one). The root not-found ships its own document.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
