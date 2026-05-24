"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

/**
 * QueryClient must live inside a component (not module scope) so each user session gets its own
 * cache instance — module-scoped clients leak data between SSR requests when this code runs in a
 * server context, and survive HMR re-imports in dev which keeps stale cache around after edits.
 * `useState` with a factory pins the instance to the component's lifetime.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Mirror the prior /me cache TTL so the swap to React Query doesn't change request
            // cadence on a per-query basis. Individual queries can override.
            staleTime: 60_000,
            // The fetch wrapper in lib/api/client.ts already does a single 401 → /auth/refresh →
            // retry on its own. Query retrying on top would compound delays + drown the backend
            // when the refresh token itself is dead.
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV !== "production" ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}
