import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest setup for the public-profile / settings React app. Targets pure-function business
 * logic — calendar export, palette/provider resolvers, oembed src rewriters. React component
 * rendering is intentionally NOT covered here; visual regressions are caught by the Playwright
 * snapshot suite (Phase 2 issue #79), and integration behavior by Playwright e2e.
 *
 * <p>Path alias mirrors {@code tsconfig.json} so tests can {@code import "@/lib/..."} the same
 * way runtime code does. jsdom environment is set for tests that touch {@code window},
 * {@code document}, or {@code navigator}; pure-math tests pay no cost since they don't allocate
 * DOM objects.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**", "tests/**", "playwright/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
